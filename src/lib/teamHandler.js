module.exports = ({ teamModel }) => {
  const saveTeams = async ({ playerIds, slackTeamId }) => {
    if (playerIds.length === 4) {
      const teams = [
        {
          player1Id: playerIds[0],
          player2Id: playerIds[1]
        },
        {
          player1Id: playerIds[2],
          player2Id: playerIds[3]
        }
      ];
      return Promise.all(
        teams.map(team =>
          teamModel.upsert({
            slackTeamId,
            player1Id: team.player1Id,
            player2Id: team.player2Id
          })
        )
      );
    }
    return playerIds;
  };

  const getTeamScores = async () => {
    const teams = await teamModel.findByRating();
    return teams
      .map(
        (team, index) =>
          `\n${index + 1}. ` +
          `<@${team.player1.slackUserId}> / ` +
          `<@${team.player2.slackUserId}> ${team.rating}`
      )
      .reduce((a, b) => a + b, []);
  };

  return {
    saveTeams,
    getTeamScores
  };
};
