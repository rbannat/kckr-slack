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
      if (match.mode === '2vs2') {
        const team1 = await teamModel.findById(match.team1Id);
        const team2 = await teamModel.findById(match.team2Id);
        slackUserIds = [
          team1.player1.slackUserId,
          team1.player2.slackUserId,
          team2.player1.slackUserId,
          team2.player2.slackUserId
        ];
      } else {
        const player1 = await playerModel.findById(match.team1Id);
        const player2 = await playerModel.findById(match.team2Id);
        slackUserIds = [player1.slackUserId, player2.slackUserId];
      }

      // notify kckr channelr
      const message = messageHelper.getMatchRecordNotificationMessage({
        createdBySlackUserId: createdBy.slackUserId,
        slackUserIds,
        match
      });
      return http.post(webhookUrl, message);
    } catch (err) {
      throw new Error(err);
    }
  };
  // setup slackMessages
  slackMessages.action('confirm_match', (payload, respond) => {
    log.info('Incoming match confirmation', payload);
    const submitValue = payload.actions[0].value;
    let matchId;
    if (submitValue.startsWith('confirm')) {
      matchId = [...submitValue.split('confirm_')].pop();
      matchModel
        .updateMatch({
          id: matchId,
          data: { status: 'confirmed' }
        })
        .then(match => {
          log.debug('Match status updated:', match.status);
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
          return sendMatchRecordNotification(match);
        })
        .catch(err => {
          log.error(err);
          respond({
            text: 'Argh, could not confirm match.'
          });
        });

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
