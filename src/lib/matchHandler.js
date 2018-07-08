module.exports = ({ log, matchModel }) => {
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
