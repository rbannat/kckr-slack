module.exports = ({ playerModel }) => {
  const savePlayers = ({ slackUserIds, slackTeamId }) =>
    Promise.all(
      slackUserIds.map(slackUserId =>
        // TODO: check id to be a valid slack user
        playerModel.upsert({
          slackUserId,
          slackTeamId
        })
      )
    );

  const getPlayerBySlackId = ({ slackTeamId, slackUserId }) =>
    playerModel.findOne({ slackTeamId, slackUserId });
  return {
    savePlayers,
    getPlayerBySlackId
  };
};
