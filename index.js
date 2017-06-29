// Import express and request modules
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');

require('dotenv').config();


var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const PORT=4390;

app.listen(PORT, function () {
  //Callback triggered when server is successfully listening. Hurray!
  console.log("Example app listening on port " + PORT);
});

app.get('/', function(req, res) {
  res.send('Ngrok is working! Path Hit: ' + req.url);
});

app.post('/kickr/reserve', function(req, res) {
  // res.json('Alles klar, um ' + req.body.text + ' Uhr ist frei');
  res.json({
    "response_type": "in_channel",
    "text": "It's 80 degrees right now.",
    "attachments": [
        {
            "text":"Partly cloudy today and tomorrow"
        }
    ]
  }) ;
});

app.post('/kickr/join/<12313>', function(req, res) {
  // res.json('Alles klar, um ' + req.body.text + ' Uhr ist frei');
  res.json({
    "response_type": "in_channel",
    "text": "It's 80 degrees right now.",
    "attachments": [
        {
            "text":"Partly cloudy today and tomorrow"
        }
    ]
  }) ;
});
