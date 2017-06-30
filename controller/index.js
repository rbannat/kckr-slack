'use strict';

// Import the interface to Tessel hardware
const tessel = require('tessel');
var socket   = require('socket.io-client')('https://dcd3dbfc.ngrok.io');

var button     = tessel.port.A.pin[2];
var blue       = tessel.port.A.pin[3];
var yellow     = tessel.port.A.pin[4];
var red        = tessel.port.A.pin[5];
var request    = require('request');

let btnPressed = false;

button.on('change', (value) => {
  console.log('Current value has changed: ' + value);

  if (!btnPressed) {
    btnPressed = true;
    request.post('https://dcd3dbfc.ngrok.io/kickr/reserve', function (error, response, body) {
      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      console.log('body:', body); // Print the body

      let options = {
        json: {
          text: 'test'
        }
      };

      request.post('https://hooks.slack.com/services/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', options);
      blue.write(1);

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


const blinkBlue = () => {
  let i = 0;
  tessel.led[2].off();
  tessel.led[3].on();
  let int = setInterval(() => {
    tessel.led[2].toggle();
    tessel.led[3].toggle();
    if (i === 5) {
      clearInterval(int);
    }
    i++;
  }, 1000);
}

socket.on('connect', function () {
  console.log('Connected to server!');
});
socket.on('event', function (data) {
  console.log('New event received!');
});

socket.on('reserve_success', function (data) {
  console.log(data);
  blinkBlue();
});

socket.on('reserve_fail', function (data) {
  console.log(data);
  tessel.led[2].on();
  tessel.led[3].off();
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


