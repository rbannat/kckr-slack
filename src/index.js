const express = require('express');
const bodyParser = require('body-parser');
// const {
//   slackIncomingWebhook,
//   slackWebClient
// } = require('@slack/client');
const slackInteractiveMessages = require('@slack/interactive-messages');
const bunyan = require('bunyan');
const moment = require('moment');
const axios = require('axios');

// load config
const config = require('./config/default');

const {
  slack: { verificationToken, messageActionPath, webhookUrl },
  db: { dbUri },
  app: { port, env }
} = config;

// create logger
const log = bunyan.createLogger({
  name: 'kckr',
  level: env === 'development' ? 'debug' : 'info'
});

const db = require('./db')();

const slackMessages = slackInteractiveMessages.createMessageAdapter(
  verificationToken
);
const http = axios.create();
const helpers = require('./lib/helpers');
const messageHelper = require('./lib/messageHelper');
const matchModel = require('./db/models/match');
const playerModel = require('./db/models/player');
const teamModel = require('./db/models/team');
const playerHandler = require('./lib/playerHandler')({ playerModel });
const teamHandler = require('./lib/teamHandler')({ teamModel });
const matchHandler = require('./lib/matchHandler')({
  log,
  matchModel,
  webhookUrl,
  messageHelper,
  http
});
const reservationHandler = require('./lib/reservationHandler')({
  log,
  slackMessages,
  moment
});
require('./lib/messageHandler')({
  log,
  matchModel,
  playerModel,
  teamModel,
  webhookUrl,
  slackMessages,
  messageHelper,
  http
});
// create app
const app = express();

// Parse application/x-www-form-urlencoded && application/json
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(messageActionPath, slackMessages.expressMiddleware());

const router = require('./router')({
  slackMessages,
  webhookUrl,
  verificationToken,
  log,
  helpers,
  matchHandler,
  reservationHandler,
  playerHandler,
  teamHandler,
  messageHelper,
  http
});

app.use('/', router);

// Connect to kckr service
// const socket = require('socket.io-client')(socketUrl);

// socket.on('connect', () => log.info('App connected to kckr.io'));
// socket.on('event', data => log.info('event', data));
// socket.on('disconnect', () => log.info('App disconnected from kckr.io'));

// connect to db and start server
db
  .connect(dbUri)
  .then(() => {
    log.info('Connected to db!');
    // Start server
    if (!module.parent) {
      app.listen(port, () => {
        log.info(`App listening on port ${port}!`);
      });
    }
  })
  .catch(() => {
    log.error('Error connecting to DB');
  });

process.on('SIGINT', () => {
  db
    .closeConnection()
    .then(() => {
      log.info('Db connection is disconnected due to application termination');
      process.exit(0);
    })
    .catch(err => {
      log.error('Could not disconnect from db', err);
    });
});
