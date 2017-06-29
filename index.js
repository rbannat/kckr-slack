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

var PORT=4390;

var db = [{
  time: '14:00',
  createdBy: 'joa',
  players: ['rene', 'stefan']
}];

app.listen(PORT, function () {
  // Callback triggered when server is successfully listening. Hurray!
  console.log('Example app listening on port ' + PORT);
});

app.get('/', function(req, res) {
  res.send('Ngrok is working! Path Hit: ' + req.url);
});

app.post('/kickr/reserve', function(req, res) {

  var requiredMatchTime = moment(req.body.text, 'hh:mm');

  const match = db.find(match => {

    const matchStart = moment(match.time, 'hh:mm');
    const matchEnd = moment(matchStart).add(20, 'minutes');
    const isReserved = requiredMatchTime.isBetween(matchStart, matchEnd) || requiredMatchTime.isSame(matchStart);

    return isReserved ? match : null;
  });

  if (!match) {

    db.push({
      time: req.body.text,
      createdBy: req.body.user_name,
      players: [
        req.body.user_name
      ]
    });

    res.json({
      response_type: 'in_channel',
      text: '<@' + req.body.user_id + '|' + req.body.user_name+ '> reserved a game at ' + req.body.text + '! Wanna join?',
      attachments: [{
        text: 'Sure you wanna go down in hell?',
        fallback: 'You are unable to choose a game',
        callback_id: db.length,
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: [{
          name: 'yes',
          text: "Yes ma'am!",
          type: 'button',
          value: 'yes',
          style: 'primary',
          response_url: process.env.HOST + '/kickr/join/' + db.length
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
  res.json({
    response_type: 'in_channel',
    replace_original: false,
    text: '<@' + json.user.id + '|' + json.user.name + '> nimmt an ... Teil!!'
  });
});
