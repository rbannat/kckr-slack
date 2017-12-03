require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const qs = require('querystring');
const debug = require('debug')('kickr');
const tokenizer = require('string-tokenizer')

const {WEBHOOK_URL, PORT, SLACK_VERIFICATION_TOKEN, SLACK_ACCESS_TOKEN} = process.env;

const app = express();
/*
* Parse application/x-www-form-urlencoded && application/json
*/
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
* Start the app
*/
init();

const matches = {};

app.get('/', (req, res) => {
  res.send('<h2>The Kickr Slack app is running</h2> <p>Follow the' +
  ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

/*
* Endpoint to receive slash commands from Slack.
* Checks verification token before parsing the command.
*/
app.post('/commands', (req, res) => {
  // extract the verification token, slash command text,
  // and trigger ID from payload
  const { token, text, trigger_id, response_url, user_id } = req.body;
  
  // check that the verification token matches expected value
  if (token === SLACK_VERIFICATION_TOKEN) {
    
    if (text.startsWith('record')) {
      debug('Incoming record slash command: ', req.body);
      
      const arrayOrUndefined = (data) => {
        if (typeof data === 'undefined' || Array.isArray(data)) {
          return data
        }
        return [data]
      }
      
      let message,
      players,
      score,
      gameMode;
      
      try {
        const tokens = tokenizer()
        .input(text)
        .token('players', /(?:@)(\w+)(?:\|)/)
        .token('score', /[0-2]\:[0-2]/)
        .resolve();
        
        debug(tokens);
        
        players = arrayOrUndefined(tokens.players);
        players = [...new Set(players)]
        if(players.length === 2) {
          gameMode = '1vs1';
        } else if (players.length === 4) {
          gameMode = '2vs2';
        } else {
          throw('Error parsing players');
        }
        debug(players)
        score = arrayOrUndefined(tokens.score)[0].split(':');
      } catch(error) {
        debug(error);
        message = {
          text: 'Sorry, could not parse the command.'
        }
        return res.send(message);
      } 
      // temporarily save match for approval
      matches[user_id] = {
        players,
        gameMode,
        score
      };
      message = {
        text: gameMode === '1vs1' ? 
        `Confirm match results <@${players[0]}> vs <@${players[1]}> ${score.join(':')} ?` : 
        `Confirm match results <@${players[0]}>, <@${players[1]}>  vs <@${players[2]}>, <@${players[3]}> ${score.join(':')} ?`,
        attachments: [
          {
            fallback: 'You are unable to confirm match',
            callback_id: 'record_match',
            actions: [{
              name: 'submit',
              value: 'submit',
              text: 'Submit',
              type: 'button',
              style: 'primary'
            },
            {
              name: 'cancel',
              value: 'cancel',
              text: 'Cancel',
              type: 'button',
              style: 'danger'
            }
          ]
        }
      ]
    }
    return res.send(message);
  }
  
  if (text === 'list') {
    return res.send(getMatchList());
  }
  
  return res.send(reserveMatch(text || '', req.body.user_id, req.body.user_name));
  
} else {
  debug('Verification token mismatch');
  res.sendStatus(500);
}
});

/*
* Endpoint to receive interactive message actions. Checks the verification token
* before handling request.
*/
app.post('/interactive-component', (req, res) => {
  
  const body = JSON.parse(req.body.payload);
  
  // check that the verification token matches expected value
  if (body.token === SLACK_VERIFICATION_TOKEN) {
    debug('Interactive action received: ', body);
    
    switch (body.callback_id) {
      case 'match_actions':
      if (body.actions[0].name === 'cancel') {
        return res.send(cancelMatch(body.actions[0].value, body.user.id, body.user.name))
      } else {
        return res.send(joinMatch(body.actions[0].value, body.user.id, body.user.name));
      }
      break;
      case 'select_times': {
        return res.send(reserveMatch(body.actions[0].selected_options[0].value, body.user.id, body.user.name));
      }
      case 'record_match': {
        debug('Incoming match confirmation', body);
        const match = matches[body.user.id];
        
        if (body.actions[0].value === 'submit') {
          res.send({text: 'Waiting for match do be recorded ...'});
          
          //TODO: matchService.enterResult();
          
          axios.post(WEBHOOK_URL, {
            text: match.gameMode === '1vs1' ?
            `<@${body.user.id}> recorded a match: <@${match.players[0]}>, <@${match.players[1]}> ${match.score.join(':')}`:
            `<@${body.user.id}> recorded a match: <@${match.players[0]}>, <@${match.players[1]}>  vs <@${match.players[2]}>, <@${match.players[3]}> ${match.score.join(':')}`
          });
          axios.post(body.response_url, {
            text: 'Your match has been recorded!',
          });
          delete matches[body.user.id]; 
        } else {
          res.send( {text: 'Match recording cancelled.'});
        }
        
        break;
      }
      default:
      // immediately respond with a empty 200 response to let
      // Slack know the command was received
      res.send('');
    }
    
  } else {
    debug('Token mismatch');
    res.sendStatus(500);
  }
});

function nearestFutureMinutes(interval, someMoment) {
  const roundedMinutes = Math.ceil(someMoment.minute() / interval) * interval;
  return someMoment.clone().minute(roundedMinutes).second(0);
}

function reserveMatch(timeString, userId, userName){
  
  const time = timeString ? moment(timeString, 'HH:mm') : moment();
  
  if (timeString.length !== 0 && checkTimeString(timeString)) {
    return {
      text: 'Oops, du musst eine gültige Zeit im Format HH:mm eingeben',
      replace_original: true,
    };
  }
  
  if (timeString.length > 0 && time.isBefore(moment())) {
    return {
      text: 'Oops, wähle einen Zeitpunkt in der Zunkunft',
      replace_original: true,
    };
  }
  
  const runningMatch = getRunningMatch(time);
  
  if (runningMatch) {
    return {
      text: 'Sorry, um ' + time.format('HH:mm') + ' Uhr ist der Raum bereits von ' + getUserObject(runningMatch.createdBy) + ' belegt!',
      attachments: [{
        fallback: 'Upgrade your Slack client to use messages like these.',
        color: '#67a92f',
        attachment_type: 'default',
        callback_id: 'select_times',
        actions: [{
          name: 'times_list',
          text: 'Wähle eine andere Zeit!',
          type: 'select',
          options: getFreeSlots()
        }],
        response_url: process.env.HOST + '/kickr/reserve'
      }]
    };
  }
  
  const newMatchId = time.format('x');
  matches.push({
    id: newMatchId,
    time: time,
    createdBy: {
      userId: userId || 'anonymous',
      userName: userName || 'anonymous',
    },
    players: [{
      userId: userId || 'anonymous',
      userName: userName || 'anonymous',
    }]
  });
  
  return {
    response_type: 'in_channel',
    text: getUserObject({userId, userName}) + ' hat von ' + time.format('HH:mm') + ' Uhr bis ' +
    moment(time).add(20, 'minutes').format('HH:mm') + ' Uhr den Kicker reserviert! Bist du dabei?',
    attachments: [{
      fallback: 'You are unable to choose a game',
      callback_id: 'match_actions',
      color: '#67a92f',
      attachment_type: 'default',
      actions: [{
        name: 'yes',
        text: "Bin dabei",
        type: 'button',
        value: newMatchId,
        style: 'primary'
      }, {
        name: 'cancel',
        text: "Spiel absagen",
        type: 'button',
        value: newMatchId,
        style: 'danger'
      }]
    }]
  };
}


function cancelMatch(matchId, userId, userName) {
  const match = matches.find((match) => match.id === matchId);
  
  if (!match) {
    return {
      text: 'Match nicht vorhanden.',
      replace_original: false,
    }
  }
  
  // check owner
  if (match.createdBy.userId === userId) {
    
    // delete match
    matches = matches.filter((match) => {
      return match.createdBy.userId !== userId;
    });
    
    return {
      text: 'Hey ' + match.players.map(player => getUserObject(player)).join(', ') +
      ', das Match um ' + match.time.format('HH:mm') + ' Uhr wurde abgesagt!',
      replace_original: true,
    }
  }
  
  return {
    text: 'Du kannst nur Spiele absagen, die du selbst angelegt hast!',
    replace_original: false,
  }
}

function joinMatch(matchId, userId, userName) {
  const match = matches.find(match => parseInt(match.id) === parseInt(matchId));
  
  if (!match) {
    return { text: 'ID falsch' };
  }
  
  if (match.createdBy.userId === userId) {
    return {
      text: 'Du kannst deinem eigenen Spiel nicht beitreten.',
      replace_original: false,
    };
  }
  
  if (match.players.find(player => player.userId === userId)) {
    return {
      text: 'Du bist bereits für das Spiel eingetragen!',
      replace_original: false,
    };
  }
  
  if (match.players.length === MAX_PLAYER) {
    
    let text = 'Perfekt, ihr seid vollständig!\n';
    text += 'Teilnehmer: ' + match.players.map(player => getUserObject(player)).join(', ') + ', '
    text += getUserObject({userName, userId}) + ' \n';
    text += 'Uhrzeit: ' + match.time.format('HH:mm') + ' Uhr'
    
    return {
      text,
      replace_original: true,
      attachments: [{
        callback_id: 'match_actions',
        color: '#67a92f',
        attachment_type: 'default',
        actions: [
          {
            name: 'cancel',
            text: "Spiel absagen",
            type: 'button',
            value: matchId,
            style: 'danger'
          }]
        }]
      };
    }
    
    match.players.push({userId, userName});
    matches[matchId] = match;
    
    return {
      response_type: 'in_channel',
      replace_original: false,
      text: getUserObject({userName, userId}) + ' spielt mit ' +
      match.players
      .filter(player => player.userId !== userId)
      .map(player => getUserObject(player))
      .join(', ')
    };
  }
  
  function checkTimeString(timeString) {
    return !/[0-2]?[0-9]:[0-5][0-9]/.test(timeString);
  }
  
  function getUserObject(user) {
    return '<@' + user.userId + '|' + user.userName + '>';
  }
  
  function getRunningMatch(requiredMatchTime) {
    
    requiredMatchTime = requiredMatchTime.format('x');
    
    return matches.find(match => {
      const matchStart = moment(match.time).format('x');
      const matchEnd = moment(match.time).add(20, 'minutes').format('x');
      return (requiredMatchTime >= matchStart && requiredMatchTime <= matchEnd);
    });
  }
  
  function getFreeSlots() {
    let nextSlot = nearestFutureMinutes(20, moment());
    let freeSlots = [];
    let time;
    
    do {
      nextSlot.add(20, 'minutes')
      if (!getRunningMatch(nextSlot)) {
        time = nextSlot.format('HH:mm');
        freeSlots.push({ text: time + ' Uhr', value: time });
      }
    } while (nextSlot.isBefore(moment().endOf('day')))
    
    return freeSlots;
  }
  
  function init() {
    app.listen(PORT, () => {
      console.log(`App listening on port ${PORT}!`);
    });
  }
  