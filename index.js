// Import express and request modules
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var moment = require('moment');

require('dotenv').config();

var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));


var server = require('http').Server(app);
var io = require('socket.io')(server);
var PORT=4390;

server.listen(PORT, function () {
  // Callback triggered when server is successfully listening. Hurray!
  console.log('Example app listening on port ' + PORT);
});

var db = [{
  time: '14:00',
  createdBy: 'joa',
  players: ['rene', 'stefan'],
  maxPlayers: 4
}];

function nearestFutureMinutes(interval, someMoment) {
  const roundedMinutes = Math.ceil(someMoment.minute() / interval) * interval;
  return someMoment.clone().minute(roundedMinutes).second(0);
}

function isSlotFree(requiredMatchTime) {
  return db.find(match => {
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

app.post('/kickr/reserve', function(req, res) {

  var requiredMatchTime = moment(req.body.text, 'HH:mm');
  const match = isSlotFree(requiredMatchTime);

  if (!match) {

    db.push({
      time: req.body.text,
      createdBy: req.body.user_name,
      players: [
        req.body.user_name
      ],
      maxPlayers: req.body.text.split(' ')[1] || 4
    });

    res.json({
      response_type: 'in_channel',
      text: '<@' + req.body.user_id + '|' + req.body.user_name+ '> reserved a game at ' + req.body.text.split(' ')[0] + '! Wanna join?',
      attachments: [{
        text: 'Sure you wanna go down in hell?',
        fallback: 'You are unable to choose a game',
        callback_id: db.length - 1,
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: [{
          name: 'yes',
          text: "Yes ma'am!",
          type: 'button',
          value: 'yes',
          style: 'primary',
          response_url: process.env.HOST + '/kickr/join'
        }]
      }]
    });
  } else {
    let text = 'Sorry, Raum ist nicht frei ;(';
    text += match.createdBy + ' spielt von ';

    res.json({ text });
  }
});

app.post('/kickr/join', function(req, res) {

  const json = JSON.parse(req.body.payload);
  const matchId = json.callback_id;
  const match = db[matchId];

  if (!match) {
    return res.json({
      text: 'ID falsch'
    })
  }

  if (match.createdBy === json.user.name) {
    return res.json({
      text: 'Du hast das Spiel erstellt, Idiot!',
      replace_original: false,
    })
  }

  if (match.players.find(player => player === json.user.name)) {
    return res.json({
      text: 'Doppelt zählt nicht!',
      replace_original: false,
    })
  }


  if (match.players.length === match.maxPlayers) {
    return res.json({
      text: 'Sorry, schon ' + match.maxPlayers + '!!',
      replace_original: true,
    })
  }

  match.players.push(json.user.name);

  db[matchId] = match;

  res.json({
    response_type: 'in_channel',
    replace_original: false,
    text: '<@' + json.user.id + '|' + json.user.name + '> spielt mit ' + match.players.filter(name => name !== json.user.name).join(' ')
  });
});
