const express = require('express');
const tokenizer = require('string-tokenizer');

const router = express.Router();

router.get('/', (req, res) => {
  res.send(
    `<h2>The Kckr Slack App is running</h2> 
      <p>Follow the instructions in the README to configure the Slack App and your environment variables.</p>`
  );
});

module.exports = ({
  log,
  verificationToken,
  helpers,
  reservationHandler,
  messageHelper,
  matchHandler,
  playerHandler,
  teamHandler,
  http
}) => {
  /** Middleware to verify slack verification token */
  function verifySlack(req, res, next) {
    // Assumes this application is is not distributed and can only be installed on one team.
    // If this assumption does not hold true, then we would modify this code as well as
    // the data model to store individual team IDs, verification tokens, and access tokens.
    if (req.body.token === verificationToken) {
      next();
    } else {
      log.error('Verification token mismatch');
      next(new Error('Could not verify the request originated from Slack.'));
    }
  }

  /*
   * Endpoint to receive slash commands from Slack.
   * Checks verification token before parsing the command.
   */
  router.post('/commands', verifySlack, async (req, res) => {
    log.info('Incoming slash command: ', req.body.text);

    const {
      text,
      user_id: slackUserId,
      team_id: slackTeamId,
      response_url: responseUrl
    } = req.body;

    if (text.startsWith('record')) {
      // parse result
      let message;
      let score;
      let players;
      try {
        const tokens = tokenizer()
          .input(text)
          .token('players', /(?:@)(\w+)(?:\|)/)
          .token('score', /[0-2]:[0-2]/)
          .resolve();
        log.debug('Parsed tokens: ', tokens);

        // ensure unique players
        players = [...new Set(helpers.arrayOrUndefined(tokens.players))];
        log.debug('Unique player ids:', players);

        if (players.length !== 2 && players.length !== 4) {
          throw new Error('Number of players needs to be two or four');
        }

        score = helpers
          .arrayOrUndefined(tokens.score)[0]
          .split(':')
          .map(singleScore => parseInt(singleScore, 10));
        log.debug('Score:', score);
        if (
          score.length !== 2 ||
          score[0] < 0 ||
          score[0] > 2 ||
          score[1] < 0 ||
          score[1] > 2 ||
          score[0] + score[1] > 3 ||
          score[0] + score[1] < 2 ||
          (score[0] === 1 && score[1] === 1)
        ) {
          throw new Error('Score is invalid');
        }
        // early return
        res.send();
      } catch (err) {
        log.error('Error parsing command: ', err);
        message = {
          text: 'Sorry, I had a problem parsing the command.'
        };
        return res.send(message);
      }
      // create players and teams if not exist and create match
      // TODO: later start account binding process
      try {
        const playerIds = await playerHandler.savePlayers({
          slackUserIds: players,
          slackTeamId
        });
        const createdBy = await playerHandler.getPlayerBySlackId({
          slackTeamId,
          slackUserId
        });
        let teamIds = playerIds;
        let mode = '1vs1';
        if (playerIds.length === 4) {
          mode = '2vs2';
          teamIds = await teamHandler.saveTeams({
            playerIds,
            slackTeamId
          });
        }
        const match = await matchHandler.saveMatch({
          slackTeamId,
          createdBy: createdBy.id,
          teamIds,
          mode,
          score
        });
        return http.post(
          responseUrl,
          messageHelper.getConfirmationMessage({
            slackUserIds: players,
            score,
            matchId: match.id
          })
        );
      } catch (err) {
        log.error(err);
        return http.post(responseUrl, {
          text: 'Argh, could not create match.'
        });
      }
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

    // TODO: default to help
    // if (!text.trim()) {
    // }
    return res.sendStatus(404);
  });

  return router;
};
