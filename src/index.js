require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const qs = require('querystring');
const debug = require('debug')('kickr');
const tokenizer = require('string-tokenizer');
const service = require('./addon/main');
const helpers = require('./helpers')

const {
  WEBHOOK_URL,
  PORT,
  SLACK_VERIFICATION_TOKEN,
  SLACK_ACCESS_TOKEN
} = process.env;

const app = express();
/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

/**
 * Start the app
 */
init();

const matches = {};
const reservedMatches = [];

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
  const {
    token,
    text,
    trigger_id,
    response_url,
    user_id
  } = req.body;

  // check that the verification token matches expected value
  if (token === SLACK_VERIFICATION_TOKEN) {

    if (text.startsWith('record')) {
      debug('Incoming record slash command: ', req.body);

      let message,
        players,
        score

      try {
        const tokens = tokenizer()
          .input(text)
          .token('players', /(?:@)(\w+)(?:\|)/)
          .token('score', /[0-2]\:[0-2]/)
          .resolve();

        debug(`Parsed tokens: `, tokens);

        // ensure unique players
        players = [...new Set(helpers.arrayOrUndefined(tokens.players))]
        debug(`Unique player ids: ${players}`);
        if (players.length !== 2 && players.length !== 4) {
          throw ('Count of players needs to be two or four');
        }

        score = helpers.arrayOrUndefined(tokens.score)[0].split(':').map((singleScore) => parseInt(singleScore));
        debug(`Score: ${score}`);
        if (score.length !== 2 || score[0] < 0 || score[0] > 2 || score[1] < 0 || score[1] > 2 || (score[0] + score[1]) > 3 || (score[0] + score[1]) < 2) {
          throw ('Score is invalid');
        }

      } catch (error) {

        debug('Error parsing command: ', error);

        message = {
          text: 'Sorry, I had a problem parsing the command.'
        }
        return res.send(message);
      }

      // temporarily save match for approval
      matches[user_id] = {
        players,
        score
      };
      message = {
        text: players.length === 2 ?
          `Confirm match results <@${players[0]}> vs <@${players[1]}> ${score.join(':')} ?` : `Confirm match results <@${players[0]}>, <@${players[1]}>  vs <@${players[2]}>, <@${players[3]}> ${score.join(':')} ?`,
        attachments: [{
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
        }]
      }
      return res.send(message);
    }

    if (text === 'list') {
      return res.send(getMatchList());
    }

    if (text === 'scores') {
      return res.send(getScores());
    }

    // default to table reservation
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

    switch (body.callback_id) {
      case 'match_actions':
        if (body.actions[0].name === 'cancel') {
          return res.send(cancelMatch(body.actions[0].value, body.user.id, body.user.name))
        } else {
          return res.send(joinMatch(body.actions[0].value, body.user.id, body.user.name));
        }
        break;
      case 'select_times':
        {
          return res.send(reserveMatch(body.actions[0].selected_options[0].value, body.user.id, body.user.name));
        }
      case 'record_match':
        {
          debug('Incoming match confirmation', body);
          const match = matches[body.user.id];

          if (body.actions[0].value === 'submit') {
            res.send({
              text: 'Waiting for match to be recorded ...'
            });

            let team1, team2, team1Name, team2Name;
            if (match.players.length === 4) {
              team1Name = match.players[0] + '.' + match.players[1];
              team2Name = match.players[2] + '.' + match.players[3];
              team1 = service.register(team1Name, 'Berlin', match.players[0], match.players[1]).data;
              team2 = service.register(team2Name, 'Berlin', match.players[2], match.players[3]).data;
            } else {
              team1Name = match.players[0];
              team2Name = match.players[1];
              team1 = service.register(match.players[0], 'Berlin', match.players[0]).data;
              team2 = service.register(match.players[1], 'Berlin', match.players[1]).data;
            }
            debug(team1, team2, team1Name, team2Name);
            debug(service.challenge('new', {
              challenger: team1.name,
              opponent: team2.name
            }));
            debug(service.challenge('enterResult', {
              party: team1.name,
              result: match.score[0] + ':' + match.score[1],
              party2: team2.name
            }));
            let result = service.challenge('enterResult', {
              party: team2.name,
              result: match.score[1] + ':' + match.score[0],
              party2: team1.name
            });
            debug(result);

            axios.post(WEBHOOK_URL, {
              text: match.players.length === 2 ?
              `<@${body.user.id}> recorded a match: <@${match.players[0]}> vs <@${match.players[1]}> ${match.score.join(':')}`:
              `<@${body.user.id}> recorded a match: <@${match.players[0]}>, <@${match.players[1]}>  vs <@${match.players[2]}>, <@${match.players[3]}> ${match.score.join(':')}`
            });
            axios.post(body.response_url, {
              text: 'Your match has been recorded!',
            });
            delete matches[body.user.id];
          } else {
            res.send({
              text: 'Match recording cancelled.'
            });
          }
          break;
        }
      default:
        debug('No callback id for incoming action', body);
        // immediately respond with a empty 200 response to let
        // Slack know the command was received
        res.send(404, 'Sorry, cannot find message action');
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

function getRunningMatch(requiredMatchTime) {

  requiredMatchTime = requiredMatchTime.format('x');

  return reservedMatches.find(match => {
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
      freeSlots.push({
        text: time + ' Uhr',
        value: time
      });
    }
  } while (nextSlot.isBefore(moment().endOf('day')))

  return freeSlots;
}

function checkTimeString(timeString) {
  return !/[0-2]?[0-9]:[0-5][0-9]/.test(timeString);
}

function getUserObject(user) {
  return '<@' + user.userId + '|' + user.userName + '>';
}

function getMatchList() {
  if (!reservedMatches.length) {
    return {
      text: 'Keine Reservierungen für heute'
    };
  }

  let list = 'Reservierungen:\n';
  list += reservedMatches.map((match, index) => {
    return '\n' + (index + 1) + '. ' + match.time.format('HH:mm') + ' Uhr, Teilnehmer:  ' +
      match.players.map(player => getUserObject(player)).join(' ')
  });

  return {
    text: list
  };
}

function getScores() {

  let teamScores = 'Team Scores:\n';
  teamScores += service.getTeamScores().slice(0, 9).map((team, index) => {
    return '\n' + (index + 1) + '. ' + '<@' + team.member[0] + '> / ' + '<@' + team.member[1] + '> ' + team.rating;
  });

  let playerScores = 'Single Player Scores:\n';
  playerScores += service.getPlayerScores().slice(0, 9).map((player, index) => {
    return '\n' + (index + 1) + '. ' + '<@' + player.name + '> ' + player.rating;
  });
  return {
    text: teamScores + '\n \n' + playerScores
  };
}

function reserveMatch(timeString, userId, userName) {

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
  reservedMatches.push({
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
    text: getUserObject({
        userId,
        userName
      }) + ' hat von ' + time.format('HH:mm') + ' Uhr bis ' +
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
  const match = reservedMatches.find((match) => match.id === matchId);

  if (!match) {
    return {
      text: 'Match nicht vorhanden.',
      replace_original: false,
    }
  }

  // check owner
  if (match.createdBy.userId === userId) {

    // delete match
    reservedMatches = reservedMatches.filter((match) => {
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
  const match = reservedMatches.find(match => parseInt(match.id) === parseInt(matchId));

  if (!match) {
    return {
      text: 'ID falsch'
    };
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
    text += getUserObject({
      userName,
      userId
    }) + ' \n';
    text += 'Uhrzeit: ' + match.time.format('HH:mm') + ' Uhr'

    return {
      text,
      replace_original: true,
      attachments: [{
        callback_id: 'match_actions',
        color: '#67a92f',
        attachment_type: 'default',
        actions: [{
          name: 'cancel',
          text: "Spiel absagen",
          type: 'button',
          value: matchId,
          style: 'danger'
        }]
      }]
    };
  }

  match.players.push({
    userId,
    userName
  });
  reservedMatches[matchId] = match;

  return {
    response_type: 'in_channel',
    replace_original: false,
    text: getUserObject({
        userName,
        userId
      }) + ' spielt mit ' +
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

  return reservedMatches.find(match => {
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
      freeSlots.push({
        text: time + ' Uhr',
        value: time
      });
    }
  } while (nextSlot.isBefore(moment().endOf('day')))

  return freeSlots;
}

function init() {
  app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
  });
}