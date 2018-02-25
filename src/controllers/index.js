const express = require('express');
const axios = require('axios');
const tokenizer = require('string-tokenizer');
const router = express.Router();
const helpers = require('../helpers');
const reservationHandler = require('../lib/reservationHandler');
const matchHandler = require('../lib/matchHandler');

router.get('/', (req, res) => {
  res.send(
    `<h2>The Kckr Slack app is running</h2> 
      <p>Follow the instructions in the README to configure the Slack App and your environment variables.</p>`
  );
});

module.exports = ({slackMessages, log, webhookUrl, verificationToken}) => {
  // Slack Interactive Messages
  slackMessages.action('match_actions', payload => {
    log.info('received match action: ', payload.actions[0]);
    if (payload.actions[0].name === 'cancel') {
      return reservationHandler.cancelMatch(
        payload.actions[0].value,
        payload.user.id
      );
    } else {
      return reservationHandler.joinMatch(
        payload.actions[0].value,
        payload.user.id,
        payload.user.name
      );
    }
  });

  slackMessages.action('select_times', payload => {
    return reservationHandler.reserveMatch(
      payload.actions[0].selected_options[0].value,
      payload.user.id,
      payload.user.name
    );
  });

  slackMessages.action('record_match', (payload, respond) => {
    log.info('Incoming match confirmation', payload);

    if (payload.actions[0].value === 'submit') {
      const match = matchHandler.getMatch(payload.user.id);
      log.debug(match);
      matchHandler.recordMatch(match);

      axios.post(webhookUrl, {
        text:
          match.players.length === 2 ?
            `<@${payload.user.id}> recorded a match: <@${
                match.players[0]
              }> vs <@${match.players[1]}> ${match.score.join(':')}` :
            `<@${payload.user.id}> recorded a match: <@${
                match.players[0]
              }>, <@${match.players[1]}>  vs <@${match.players[2]}>, <@${
                match.players[3]
              }> ${match.score.join(':')}`
      });

      matchHandler.deleteMatch(payload.user.id);
      respond({
        text: 'Your match has been recorded!',
        attachments: [
          {
            title: 'Team Scores',
            text: matchHandler.getTeamScores()
          },
          {
            title: 'Single Player Scores',
            text: matchHandler.getSingleScores()
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

  /*
 * Endpoint to receive slash commands from Slack.
 * Checks verification token before parsing the command.
 */
  router.post('/commands', (req, res) => {
    // extract the verification token, slash command text,
    // and trigger ID from payload
    const {token, text, user_id} = req.body;
    // check that the verification token matches expected value
    if (token === verificationToken) {
      if (text.startsWith('record')) {
        log.info('Incoming record slash command: ', req.body);
        // parse result
        let message, players, score;
        try {
          const tokens = tokenizer()
            .input(text)
            .token('players', /(?:@)(\w+)(?:\|)/)
            .token('score', /[0-2]:[0-2]/)
            .resolve();

          log.debug('Parsed tokens: ', tokens);
          // ensure unique players
          players = [...new Set(helpers.arrayOrUndefined(tokens.players))];
          log.debug(`Unique player ids: ${players}`);
          if (players.length !== 2 && players.length !== 4) {
            throw 'Count of players needs to be two or four';
          }
          score = helpers
            .arrayOrUndefined(tokens.score)[0]
            .split(':')
            .map(singleScore => parseInt(singleScore));
          log.debug(`Score: ${score}`);
          if (
            score.length !== 2 ||
            score[0] < 0 ||
            score[0] > 2 ||
            score[1] < 0 ||
            score[1] > 2 ||
            score[0] + score[1] > 3 ||
            score[0] + score[1] < 2
          ) {
            throw 'Score is invalid';
          }
        } catch (error) {
          log.debug('Error parsing command: ', error);
          message = {
            text: 'Sorry, I had a problem parsing the command.'
          };
          return res.send(message);
        }
        // temporarily save match for approval
        matchHandler.storeMatch(user_id, players, score);
        message = matchHandler.getConfirmationMessage(players, score);
        return res.send(message);
      }

      if (text === 'list') {
        return res.send(reservationHandler.getMatchList());
      }

      if (text === 'scores') {
        return res.send({
          text: '',
          attachments: [
            {
              title: 'Team Scores',
              text: matchHandler.getTeamScores()
            },
            {
              title: 'Single Player Scores',
              text: matchHandler.getSingleScores()
            }
          ]
        });
      }

      // default to table reservation
      return res.send(
        reservationHandler.reserveMatch(
          text || '',
          req.body.user_id,
          req.body.user_name
        )
      );
    } else {
      log.error('Verification token mismatch');
      res.sendStatus(500);
    }
  });

  return router;
};
