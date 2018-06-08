module.exports = ({
  slackMessages,
  messageHelper,
  matchModel,
  playerModel,
  teamModel,
  log,
  http,
  webhookUrl
}) => {
  const sendMatchRecordNotification = async match => {
    try {
      const createdBy = await playerModel.findById(match.createdBy);
      let slackUserIds;
      let team1;
      let team2;
      if (match.mode === '2vs2') {
        team1 = await teamModel.findById(match.team1Id);
        team2 = await teamModel.findById(match.team2Id);
        slackUserIds = [
          team1.player1.slackUserId,
          team1.player2.slackUserId,
          team2.player1.slackUserId,
          team2.player2.slackUserId
        ];
      } else {
        team1 = await playerModel.findById(match.team1Id);
        team2 = await playerModel.findById(match.team2Id);
        slackUserIds = [team1.slackUserId, team2.slackUserId];
      }

      // notify kckr channelr
      const message = messageHelper.getMatchRecordNotificationMessage({
        createdBySlackUserId: createdBy.slackUserId,
        slackUserIds,
        score:
          team1.id.toString() === match.winner.toString()
            ? [match.winnerScore, match.loserScore]
            : [match.loserScore, match.winnerScore]
      });
      return http.post(webhookUrl, message);
    } catch (err) {
      throw new Error(err);
    }
  };

  const getNewRating = ({ playerRating, opponentRating, won }) => {
    const kFactor = 32;
    if (typeof won === 'undefined') {
      throw new Error('Rating cannot be calculated');
    }

    const difference = opponentRating - playerRating;
    const percentage = 1 / (1 + 10 ** (difference / 400));

    if (won) {
      return playerRating + Math.round(kFactor * (1 - percentage));
    }
    return playerRating + Math.round(kFactor * (0 - percentage));
  };

  const updatePlayerRatings = async ({ player1Id, player2Id, winner }) => {
    const players = await Promise.all([
      playerModel.findById(player1Id),
      playerModel.findById(player2Id)
    ]);
    return Promise.all(
      players.map((player, index) => {
        player.set({
          rating: getNewRating({
            playerRating: player.rating,
            opponentRating: index === 0 ? players[1].rating : players[0].rating,
            won: player.id.toString() === winner.toString()
          })
        });
        return player.save();
      })
    );
  };

  const updateTeamRatings = async ({ team1Id, team2Id, winner }) => {
    const teams = await Promise.all([
      teamModel.findById(team1Id),
      teamModel.findById(team2Id)
    ]);

    return Promise.all(
      teams.map((team, index) => {
        team.set({
          rating: getNewRating({
            playerRating: team.rating,
            opponentRating: index === 0 ? teams[1].rating : teams[0].rating,
            won: team === winner
          })
        });
        return team.save();
      })
    );
  };

  const confirmMatch = async ({ matchId }, respond) => {
    try {
      const match = await matchModel.updateMatch({
        id: matchId,
        data: { status: 'confirmed' }
      });
      log.debug('Match status updated:', match.status);
      const { team1Id, team2Id, winner } = match;
      if (match.mode === '2vs2') {
        await updateTeamRatings({ team1Id, team2Id, winner });
      } else {
        await updatePlayerRatings({
          player1Id: team1Id,
          player2Id: team2Id,
          winner
        });
      }

      respond({
        text: 'Your match has been recorded!'
        // attachments: [
        //   {
        //     title: 'Team Scores',
        //     text: getTeamScores()
        //   },
        //   {
        //     title: 'Single Player Scores',
        //     text: getSingleScores()
        //   }
        // ]
      });
      return await sendMatchRecordNotification(match);
    } catch (err) {
      log.error(err);
      return respond({
        text: 'Argh, something went wrong while saving your match.'
      });
    }
  };

  // setup slackMessages
  slackMessages.action('confirm_match', (payload, respond) => {
    log.info('Incoming match confirmation');
    const submitValue = payload.actions[0].value;
    let matchId;
    if (submitValue.startsWith('confirm')) {
      matchId = [...submitValue.split('confirm_')].pop();
      confirmMatch({ matchId }, respond);
      return {
        text: 'Waiting for match to be recorded ...'
      };
    }
    matchId = [...submitValue.split('cancel_')].pop();
    matchModel
      .deleteMatch({ id: matchId })
      .then(() => log.info('Match deleted:', matchId))
      .catch(err => log.error('Could not delete match', err));

    return {
      text: 'Match recording cancelled.'
    };
  });

  return {};
};
