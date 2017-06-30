'use strict';

// Import the interface to Tessel hardware
const tessel = require('tessel');
var socket = require('socket.io-client')('https://6d324cd3.ngrok.io');

var pin = tessel.port.A.pin[2];

pin.read(function(error, number) {
  if (error) {
    throw error;
  }

  console.log(number); // 1 if "high", 0 if "low"
});

pin.on('change', (value) => {
	console.log('Current value has changed: ' + value);
});

pin.write(1, (error, buffer) => {
  if (error) {
    throw error;
  }

  console.log(buffer.toString()); // Log the value written to the pin
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
		if(i === 5) {
			clearInterval(int);
		}
	  i++;
	}, 1000);
}

socket.on('connect', function() {
	console.log('Connected to server!');
});
socket.on('event', function(data) {
	console.log('New event received!');
});

socket.on('reserve_success', function(data) {
	console.log(data);
	blinkBlue();
});

socket.on('reserve_fail', function(data) {
	console.log(data);
	tessel.led[2].on();
	tessel.led[3].off();
});

socket.on('disconnect', function() {
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


