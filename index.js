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
  id: 1,
  time: '14:00',
  createdBy: 'joa',
  players: ['rene', 'stefan']
}];

app.listen(PORT, function () {
  //Callback triggered when server is successfully listening. Hurray!
  console.log("Example app listening on port " + PORT);
});

app.get('/', function(req, res) {
  res.send('Ngrok is working! Path Hit: ' + req.url);
});

app.post('/kickr/reserve', function(req, res) {
  
  console.log(req.body.text);

  // TODO Parse
  var requiredMatchTime = moment(req.body.text, 'hh:mm');

  const roomReserved = db.find(match => {

    const matchStart = moment(match.time, 'hh:mm');
    const matchEnd = moment(matchStart).add(20, 'minutes');
    const isReserved = requiredMatchTime.isBetween(matchStart, matchEnd) || requiredMatchTime.isSame(matchStart);

    return isReserved;
  });

  if (!roomReserved) {
    res.json({
      "response_type": "in_channel",
       "text": "Kickrbot reserved a game at 14:00! Wanna join?",
        "attachments": [
            {
                "text": "Sure you wanna go down in hell?",
                "fallback": "You are unable to choose a game",
                "callback_id": "wopr_game",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "yes",
                        "text": "Yes ma'am!",
                        "type": "button",
                        "value": "yes",
              "style": "primary"
                    }
                ]
            }
        ]
    });
  } else {
    res.json({
      'text': 'Sorry, Raum ist nicht frei ;('
    });
  }
});

app.post('/kickr/join', function(req, res) {
  console.log(req.body);

  res.json({
    "response_type": "in_channel",
    "text": "It's 80 degrees right now.",
    "attachments": [
        {
            "text":"Partly cloudy today and tomorrow"
        }
    ]
  });
});
