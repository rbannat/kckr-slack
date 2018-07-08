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

  const getPlayerScores = async () => {
    const players = await playerModel.findByRating();
    return players
      .map(
        (player, index) =>
          `\n${index + 1}. <@${player.slackUserId}> ${player.rating}`
      )
      .reduce((a, b) => a + b, []);
  };

  return {
    savePlayers,
    getPlayerBySlackId,
    getPlayerScores
  };
};
