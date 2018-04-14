const config = require('./config/default');
const express = require('express');
const bodyParser = require('body-parser');
// const {
//   slackIncomingWebhook,
//   slackWebClient
// } = require('@slack/client');
const serverless = require('serverless-http');
const slackInteractiveMessages = require('@slack/interactive-messages');
const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'app'
});

// load config
const {
  slack: {verificationToken, messageActionPath, webhookUrl},
  kckr: {socketUrl}
} = config;

const app = express();

// Parse application/x-www-form-urlencoded && application/json
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

const slackMessages = slackInteractiveMessages.createMessageAdapter(
  verificationToken
);
app.use(messageActionPath, slackMessages.expressMiddleware());

const router = require('./controllers')({
  slackMessages,
  webhookUrl,
  verificationToken,
  log
});
app.use('/', router);

// Connect to kckr service
const socket = require('socket.io-client')(socketUrl);
socket.on('connect', () => log.info('App connected to kckr.io'));
socket.on('event', data => log.info('event', data));
socket.on('disconnect', () => log.info('App disconnected from kckr.io'));

// Start server
// app.listen(port, () => {
//   log.info(`App listening on port ${port}!`);
// });

module.exports.handler = serverless(app);