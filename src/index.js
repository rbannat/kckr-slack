const config = require('./config');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
// const {
//   slackIncomingWebhook,
//   slackWebClient
// } = require('@slack/client');
const slackInteractiveMessages = require('@slack/interactive-messages');
const debug = require('debug')('kickr');
const tokenizer = require('string-tokenizer');
const service = require('./addon/main');
const helpers = require('./helpers');
const reservationManager = require('./reservationManager');
// const recordMatchHandler = require('./recordMatchHandler');

// load environment config
const {
  app: {
    port
  },
  slack: {
    verificationToken,
    webhookUrl,
    messageActionPath
  }
} = config;

const app = express();

// Parse application/x-www-form-urlencoded && application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const slackMessages = slackInteractiveMessages.createMessageAdapter(verificationToken);
app.use(messageActionPath, slackMessages.expressMiddleware());

// Start server
init();

app.get('/', (req, res) => {
  res.send(
    `<h2>The Kckr Slack app is running</h2> 
    <p>Follow the instructions in the README to configure the Slack App and your environment variables.</p>`
  );
});

const matches = {};

/*
 * Endpoint to receive slash commands from Slack.
 * Checks verification token before parsing the command.
 */
app.post('/commands', (req, res) => {
  // extract the verification token, slash command text,
  // and trigger ID from payload
  const {
    token,
    text,
    user_id
  } = req.body;

  // check that the verification token matches expected value
  if (token === verificationToken) {

    if (text.startsWith('record')) {
      debug('Incoming record slash command: ', req.body);

      let message,
        players,
        score;

      try {
        const tokens = tokenizer()
          .input(text)
          .token('players', /(?:@)(\w+)(?:\|)/)
          .token('score', /[0-2]:[0-2]/)
          .resolve();

        debug(`Parsed tokens: `, tokens);

        // ensure unique players
        players = [...new Set(helpers.arrayOrUndefined(tokens.players))]
        debug(`Unique player ids: ${players}`);
        if (players.length !== 2 && players.length !== 4) {
          throw ('Count of players needs to be two or four');
        }

        score = helpers.arrayOrUndefined(tokens.score)[0].split(':').map((singleScore) => parseInt(singleScore));
        debug(`Score: ${score}`);
        if (score.length !== 2 || score[0] < 0 || score[0] > 2 || score[1] < 0 || score[1] > 2 || (score[0] + score[1]) > 3 || (score[0] + score[1]) < 2) {
          throw ('Score is invalid');
        }

      } catch (error) {

        debug('Error parsing command: ', error);

        message = {
          text: 'Sorry, I had a problem parsing the command.'
        }
        return res.send(message);
      }

      // temporarily save match for approval
      matches[user_id] = {
        players,
        score
      };
      message = {
        text: players.length === 2 ?
          `Confirm match results <@${players[0]}> vs <@${players[1]}> ${score.join(':')} ?` : `Confirm match results <@${players[0]}>, <@${players[1]}>  vs <@${players[2]}>, <@${players[3]}> ${score.join(':')} ?`,
        attachments: [{
          fallback: 'You are unable to confirm match',
          callback_id: 'record_match',
          actions: [{
              name: 'submit',
              value: 'submit',
              text: 'Submit',
              type: 'button',
              style: 'primary'
            },
            {
              name: 'cancel',
              value: 'cancel',
              text: 'Cancel',
              type: 'button',
              style: 'danger'
            }
          ]
        }]
      }
      return res.send(message);
    }

    if (text === 'list') {
      return res.send(reservationManager.getMatchList());
    }

    if (text === 'scores') {
      return res.send(getScores());
    }

    // default to table reservation
    return res.send(reservationManager.reserveMatch(text || '', req.body.user_id, req.body.user_name));

  } else {
    debug('Verification token mismatch');
    res.sendStatus(500);
  }
});

// Slack Interactive Messages
slackMessages.action('match_actions', payload => {
  debug('received match action: ', payload.actions[0]);
  if (payload.actions[0].name === 'cancel') {
    return reservationManager.cancelMatch(payload.actions[0].value, payload.user.id);
  } else {
    return reservationManager.joinMatch(payload.actions[0].value, payload.user.id, payload.user.name);
  }
});

slackMessages.action('select_times', payload => {
  return reservationManager.reserveMatch(payload.actions[0].selected_options[0].value, payload.user.id, payload.user.name);
});

slackMessages.action('record_match', (payload, respond) => {
  debug('Incoming match confirmation', payload);
  const match = matches[payload.user.id];

  if (payload.actions[0].value === 'submit') {

    let team1, team2, team1Name, team2Name;
    if (match.players.length === 4) {
      team1Name = match.players[0] + '.' + match.players[1];
      team2Name = match.players[2] + '.' + match.players[3];
      team1 = service.register(team1Name, 'Berlin', match.players[0], match.players[1]).data;
      team2 = service.register(team2Name, 'Berlin', match.players[2], match.players[3]).data;
    } else {
      team1Name = match.players[0];
      team2Name = match.players[1];
      team1 = service.register(match.players[0], 'Berlin', match.players[0]).data;
      team2 = service.register(match.players[1], 'Berlin', match.players[1]).data;
    }
    debug(team1, team2, team1Name, team2Name);
    debug(service.challenge('new', {
      challenger: team1.name,
      opponent: team2.name
    }));
    debug(service.challenge('enterResult', {
      party: team1.name,
      result: match.score[0] + ':' + match.score[1],
      party2: team2.name
    }));
    let result = service.challenge('enterResult', {
      party: team2.name,
      result: match.score[1] + ':' + match.score[0],
      party2: team1.name
    });
    debug(result);

    axios.post(webhookUrl, {
      text: match.players.length === 2 ?
        `<@${payload.user.id}> recorded a match: <@${match.players[0]}> vs <@${match.players[1]}> ${match.score.join(':')}` : `<@${payload.user.id}> recorded a match: <@${match.players[0]}>, <@${match.players[1]}>  vs <@${match.players[2]}>, <@${match.players[3]}> ${match.score.join(':')}`
    });

    respond({
      text: 'Your match has been recorded!',
    });

    delete matches[payload.user.id];

    return {
      text: 'Waiting for match to be recorded ...'
    };
  } else {
    return {
      text: 'Match recording cancelled.'
    };
  }
});

function getScores() {

  let teamScores = 'Team Scores:\n';
  teamScores += service.getTeamScores().slice(0, 9).map((team, index) => {
    return '\n' + (index + 1) + '. ' + '<@' + team.member[0] + '> / ' + '<@' + team.member[1] + '> ' + team.rating;
  });

  let playerScores = 'Single Player Scores:\n';
  playerScores += service.getPlayerScores().slice(0, 9).map((player, index) => {
    return '\n' + (index + 1) + '. ' + '<@' + player.name + '> ' + player.rating;
  });
  return {
    text: teamScores + '\n \n' + playerScores
  };
}

function init() {
  app.listen(port, () => {
    debug(`App listening on port ${port}!`);
  });
}