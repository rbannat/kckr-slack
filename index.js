// Import express and request modules
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var moment = require('moment');
const MAX_PLAYER = 2;

require('dotenv').config();

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var PORT=4390;
var matches = [];

app.use(bodyParser.urlencoded({ extended: true }));
server.listen(PORT, function () {
  console.log('Example app listening on port ' + PORT);
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

app.get('/kickr/free', function(req, res) {

  const nextMatch = matches.find(match => {
    return match.id > moment().format('x');
  });

  res.json({
    minutesToNextMatch: nextMatch ? moment(nextMatch.time).diff(moment(), 'minutes') : -1,
    match: nextMatch
  });
});

app.post('/kickr/reserve', function(req, res) {
  res.json(reserveMatch(req.body.text, req.body.user_id, req.body.user_name));
});

app.post('/kickr/action', function(req, res) {
  const json = JSON.parse(req.body.payload);
  const actionId = json.callback_id;

  switch (actionId) {
    case 'match_actions':
      if (json.actions[0].name === 'cancel') {
        res.json(cancelMatch(json.actions[0].value, json.user.id, json.user.name))
      } else {
        res.json(joinMatch(json.actions[0].value, json.user.id, json.user.name));
      }
      break;
    case 'select_times':
      res.json(reserveMatch(json.actions[0].selected_options[0].value, json.user.id, json.user.name));
      break;
  }
});


function nearestFutureMinutes(interval, someMoment) {
  const roundedMinutes = Math.ceil(someMoment.minute() / interval) * interval;
  return someMoment.clone().minute(roundedMinutes).second(0);
}


function isSlotFree(requiredMatchTime) {
  return matches.find(match => {
    const matchStart = moment(match.time, 'HH:mm');
    const matchEnd = moment(matchStart).add(20, 'minutes');
    const isReserved = requiredMatchTime.isBetween(matchStart, matchEnd) || requiredMatchTime.isSame(matchStart);
    return isReserved ? match : null;
  });
}


function getFreeSlots() {
  let nextSlot = nearestFutureMinutes(20, moment());
  let freeSlots = [];
  let time;

  do {
    nextSlot.add(20, 'minutes')
    if (!isSlotFree(nextSlot)) {
      time = nextSlot.format('HH:mm');
      freeSlots.push({ text: time + ' Uhr', value: time });
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

function reserveMatch(timeString, userId, userName){

  const time = timeString ? moment(timeString, 'HH:mm') : moment();

  if (timeString.length !== 0 && checkTimeString(timeString)) {
    return {
      text: 'Oops, du musst eine gültige Zeit im Format HH:mm eingeben',
      replace_original: true,
    };

    if (time.isBefore(moment())) {
      return {
        text: 'Oops, wähle einen Zeitpunkt in der Zunkunft',
        replace_original: true,
      };
    }
  }

  const match = isSlotFree(time);

  if (!match) {

    const newMatchId = time.format('x');
    matches.push({
      id: newMatchId,
      time: time,
      createdBy: {
        userId,
        userName,
      },
      players: [
        {
          userId,
          userName
        }
      ]
    });

    io.emit('reserve_success', { data: 'reserved successful' });

    return {
      response_type: 'in_channel',
      text: getUserObject({userId, userName}) + ' hat von ' + time.format('HH:mm') + ' Uhr bis ' +
       time.add(20, 'minutes').format('HH:mm') +' den Kicker reserviert! Bist du dabei?',
      attachments: [{
        text: 'Sure you wanna go down in hell?',
        fallback: 'You are unable to choose a game',
        callback_id: 'match_actions',
        color: '#67a92f',
        attachment_type: 'default',
        actions: [{
          name: 'yes',
          text: "Bin dabei!",
          type: 'button',
          value: newMatchId,
          style: 'primary'
        },
          {
            name: 'cancel',
            text: "Spiel absagen",
            type: 'button',
            value: newMatchId,
            style: 'danger'
          }]
      }]
    };
  } else {
    return {
      text: 'Sorry, um ' + time.format('HH:mm') + ' Uhr ist der Raum bereits von ' + getUserObject(match.createdBy) + ' belegt!',
      response_type: 'in_channel',
      attachments: [
        {
          fallback: 'Upgrade your Slack client to use messages like these.',
          color: '#67a92f',
          attachment_type: 'default',
          callback_id: 'select_times',
          actions: [
            {
              name: 'times_list',
              text: 'Wähle eine andere Zeit!',
              type: 'select',
              options: getFreeSlots()
            }
          ],
          response_url: process.env.HOST + '/kickr/reserve'
        }
      ]
    };
  }
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
        ', das Match um ' + match.time.format('HH:mm') + ' Uhr wurde gecancelled!',
      replace_original: true,
    }
  } else {
    return {
      text: 'Du bist nicht der owner!',
      replace_original: false,
    }
  }
}

function joinMatch(matchId, userId, userName) {
  const match = matches.find(match => parseInt(match.id) === parseInt(matchId));

  if (!match) {
    return { text: 'ID falsch' };
  }

  if (match.createdBy.userId === userId) {
    return {
      text: 'Du hast das Spiel erstellt, Idiot!',
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
