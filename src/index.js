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
const helpers = require('./helpers');
const reservationManager = require('./reservationManager');
const recordMatchHandler = require('./recordMatchHandler');

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
      // parse result
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
      recordMatchHandler.storeMatch(user_id, players, score);
      message = recordMatchHandler.getConfirmationMessage(players, score);
      return res.send(message);
    }

    if (text === 'list') {
      return res.send(reservationManager.getMatchList());
    }

    if (text === 'scores') {
      return res.send({
        text: '',
        attachments: [
          {
            title: 'Team Scores',
            text: recordMatchHandler.getTeamScores()
          },
          {
            title: 'Single Player Scores',
            text: recordMatchHandler.getSingleScores()
          }
        ]
      });
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
  
  if (payload.actions[0].value === 'submit') {
    const match = recordMatchHandler.getMatch(payload.user.id);
    debug(match);
    recordMatchHandler.recordMatch(match);
    
    axios.post(webhookUrl, {
      text: match.players.length === 2 ?
      `<@${payload.user.id}> recorded a match: <@${match.players[0]}> vs <@${match.players[1]}> ${match.score.join(':')}` : `<@${payload.user.id}> recorded a match: <@${match.players[0]}>, <@${match.players[1]}>  vs <@${match.players[2]}>, <@${match.players[3]}> ${match.score.join(':')}`
    });
    
    recordMatchHandler.deleteMatch(payload.user.id);
    respond({
      text: 'Your match has been recorded!',
      attachments: [
        {
          title: 'Team Scores',
          text: recordMatchHandler.getTeamScores()
        },
        {
          title: 'Single Player Scores',
          text: recordMatchHandler.getSingleScores()
        }
      ]
    });

    return {
      text: 'Waiting for match to be recorded ...'
    };
  } else {
    return {
      text: 'Match recording cancelled.'
    };
  }
});

function init() {
  app.listen(port, () => {
    debug(`App listening on port ${port}!`);
  });
}