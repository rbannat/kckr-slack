const service = require('../addon/main');

const matches = {};

module.exports = {
  getTeamScores: () =>
    service
      .getTeamScores()
      .slice(0, 9)
      .map(
        (team, index) =>
          `\n${index + 1}. ` +
          `<@${team.member[0]}> / ` +
          `<@${team.member[1]}> ${team.rating}`
      )
      .reduce((a, b) => a + b, []),
  getSingleScores: () =>
    service
      .getPlayerScores()
      .slice(0, 9)
      .map(
        (player, index) => `\n${index + 1}. <@${player.name}> ${player.rating}`
      )
      .reduce((a, b) => a + b, []),
  getConfirmationMessage(players, score) {
    return {
      text:
        players.length === 2
          ? `Confirm match results <@${players[0]}> vs <@${
              players[1]
            }> ${score.join(':')} ?`
          : `Confirm match results <@${players[0]}>, <@${players[1]}>  vs <@${
              players[2]
            }>, <@${players[3]}> ${score.join(':')} ?`,
      attachments: [
        {
          fallback: 'You are unable to confirm match',
          callback_id: 'record_match',
          actions: [
            {
              name: 'submit',
              value: 'submit',
              text: 'Submit',
              type: 'button',
              style: 'primary'
            },
            {
              name: 'cancel',
              value: 'cancel',
              text: 'Cancel',
              type: 'button',
              style: 'danger'
            }
          ]
        }
      ]
    };
  },
  storeMatch(userId, players, score) {
    matches[userId] = {
      players,
      score
    };
  },
  getMatch(userId) {
    return matches[userId];
  },
  deleteMatch(userId) {
    delete matches[userId];
  },
  recordMatch(match) {
    let team1;
    let team2;
    let team1Name;
    let team2Name;
    if (match.players.length === 4) {
      team1Name = `${match.players[0]}.${match.players[1]}`;
      team2Name = `${match.players[2]}.${match.players[3]}`;
      team1 = service.register(
        team1Name,
        'Berlin',
        match.players[0],
        match.players[1]
      ).data;
      team2 = service.register(
        team2Name,
        'Berlin',
        match.players[2],
        match.players[3]
      ).data;
    } else {
      [team1Name, team2Name] = match.players;
      team1 = service.register(match.players[0], 'Berlin', match.players[0])
        .data;
      team2 = service.register(match.players[1], 'Berlin', match.players[1])
        .data;
    }
    return service.challenge('enterResult', {
      party: team2.name,
      result: `${match.score[1]}:${match.score[0]}`,
      party2: team1.name
    });
  }
};
