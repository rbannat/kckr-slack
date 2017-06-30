'use strict';

const URL = 'https://563cf559.ngrok.io';

// Import the interface to Tessel hardware
const tessel = require('tessel');
var socket   = require('socket.io-client')(URL);

var button  = tessel.port.A.pin[2];
var blue    = tessel.port.A.pin[3];
var yellow  = tessel.port.A.pin[4];
var red     = tessel.port.A.pin[5];
var request = require('request');

// check running game
request.get(URL + '/kickr/free', function (error, response, body) {

  let options = JSON.parse(body);
  console.log(options);

  if (options.runningMatch) {
    red.write(1);
  } else if (options.minutesToNextMatch <= 20) {
    yellow.write(1);
  } else {
    blue.write(1);
  }
});

let btnPressed = false;

button.on('change', (value) => {
  console.log('Current value has changed: ' + value);

  if (!btnPressed) {
    btnPressed = true;
    request.post(URL + '/kickr/reserve', function (error, response, body) {
      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      console.log('body:', body); // Print the body

      let options = body;
      if (JSON.parse(options).attachments[0].callback_id === 'match_actions') {
      	console.log(options);
        request.post('https://hooks.slack.com/services/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', options);
        blue.write(1);
        red.write(0);

      } else {
        blue.write(0);
        red.write(1);
      }


      setTimeout(function () {
        btnPressed = false;
      }, 500)
    });
  }
});


// // Get time to next match

// 	--> now or in 20 minutes games?
// 	--> playing is not possible when time <= 20 (yellow led)

// // Request reservation now


// // Reservation successful
// socket.on('can_start', () => {
// 	console.log('LED Red');
// })

socket.on('connect', function () {
  console.log('Connected to server!');
});

socket.on('disconnect', function () {
  console.log('Disconnected from server!');
});

// Turn one of the LEDs on to start.
tessel.led[2].on();

// // Blink!
// setInterval(() => {
//   tessel.led[2].toggle();
//   tessel.led[3].toggle();
// }, 100);

console.log("I'm blinking! (Press CTRL + C to stop)");


