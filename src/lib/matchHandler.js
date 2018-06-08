module.exports = ({ log, matchModel }) => {
  // const getTeamScores = () =>
  //   service
  //     .getTeamScores()
  //     .slice(0, 9)
  //     .map(
  //       (team, index) =>
  //         `\n${index + 1}. ` +
  //         `<@${team.member[0]}> / ` +
  //         `<@${team.member[1]}> ${team.rating}`
  //     )
  //     .reduce((a, b) => a + b, []);

  // const getSingleScores = () =>
  //   service
  //     .getPlayerScores()
  //     .slice(0, 9)
  //     .map(
  //       (player, index) => `\n${index + 1}. <@${player.name}> ${player.rating}`
  //     )
  //     .reduce((a, b) => a + b, []);

  const saveMatch = ({ teamIds, mode, score, slackTeamId, createdBy }) =>
    matchModel
      .saveMatch({
        slackTeamId,
        createdBy,
        team1Id: teamIds[0],
        team2Id: teamIds[1],
        mode,
        winner: score[0] > score[1] ? teamIds[0] : teamIds[1],
        winnerScore: score[0] > score[1] ? score[0] : score[1],
        loserScore: score[0] < score[1] ? score[0] : score[1],
        status: 'draft'
      })
      .then(match => {
        log.debug('Match saved:', match);
        return match;
      })
      .catch(err => {
        log.error(err);
        throw new Error(err);
      });

  return {
    saveMatch
  };
};
