// Import express and request modules
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var moment = require('moment');
const MAX_PLAYER = 4;

require('dotenv').config();

var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

var server = require('http').Server(app);
var io = require('socket.io')(server);
var PORT=4390;
var matches = [];

server.listen(PORT, function () {
  console.log('Example app listening on port ' + PORT);
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

app.post('/kickr/reserve', function(req, res) {
  res.json(reserveMatch(req.body.text, req.body.user_id, req.body.user_name));
});

app.post('/kickr/action', function(req, res) {
  const json = JSON.parse(req.body.payload);
  const actionId = json.callback_id;

  switch (actionId) {
    case 'join_btn':
      res.json(joinMatch(json.actions[0].value, json.user.id, json.user.name));
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


function reserveMatch(timeString, userId, userName){

  if (timeString.length !== 5 || !/[0-2]?[0-9]:[0-5][0-9]/.test(timeString)) {
    return {
      text: 'Oops, du musst eine gültige Zeit im Format HH:mm übergeben.',
      replace_original: true,
    };
  }

  const time = timeString ? moment(timeString, 'HH:mm') : moment();
  const match = isSlotFree(time);

  if (!match) {

    const newMatchId = time.format('x');
    matches.push({
      id: newMatchId,
      time: time,
      createdBy: userName,
      players: [
        userName
      ]
    });

    io.emit('reserve_success', { data: 'reserved successful' });

    return {
      response_type: 'in_channel',
      text: '<@' + userId + '|' + userName+ '> reserved a game at ' + time.format('HH:mm') + '! Wanna join?',
      attachments: [{
        text: 'Sure you wanna go down in hell?',
        fallback: 'You are unable to choose a game',
        callback_id: 'join_btn',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: [{
          name: 'yes',
          text: "Yes ma'am!",
          type: 'button',
          value: newMatchId,
          style: 'primary',
          response_url: process.env.HOST + '/kickr/join'
        }]
      }]
    };
  } else {
    return {
      text: 'Sorry, um ' + time.format('HH:mm') + ' Uhr ist der Raum bereits von <@' + userId + '|' + userName + '> belegt!',
      response_type: 'in_channel',
      attachments: [
        {
          fallback: 'Upgrade your Slack client to use messages like these.',
          color: '3AA3E3',
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


function joinMatch(matchId, userId, userName) {
  const match = matches.find(match => parseInt(match.id) === parseInt(matchId));

  if (!match) {
    return { text: 'ID falsch' };
  }

  if (match.createdBy === userName) {
    return {
      text: 'Du hast das Spiel erstellt, Idiot!',
      replace_original: false,
    };
  }

  if (match.players.find(player => player === userName)) {
    return {
      text: 'Doppelt zählt nicht!',
      replace_original: false,
    };
  }

  if (match.players.length === MAX_PLAYER) {
    return {
      text: 'Sorry, schon ' + MAX_PLAYER + '!!',
      replace_original: true,
    };
  }

  match.players.push(userName);
  matches[matchId] = match;

  return {
    response_type: 'in_channel',
    replace_original: false,
    text: '<@' + userId + '|' + userName + '> spielt mit ' + match.players.filter(name => name !== userName).join(' ')
  };
}
