module.exports = ({ slackMessages, log, http, webhookUrl, db }) => {
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

  const createConfirmationMessage = (playersText, match) => ({
    text: `Confirm match results ${playersText} ${match.winnerScore} : ${
      match.loserScore
    } ?`,
    attachments: [
      {
        fallback: 'You are unable to confirm match',
        callback_id: 'confirm_match',
        actions: [
          {
            name: 'submit',
            value: `confirm_${match.id}`,
            text: 'Submit',
            type: 'button',
            style: 'primary'
          },
          {
            name: 'cancel',
            value: `cancel_${match.id}`,
            text: 'Cancel',
            type: 'button',
            style: 'danger'
          }
        ]
      }
    ]
  });

  const createMatchRecordNotificationMessage = (
    userId,
    playersText,
    match
  ) => ({
    text: `<@${userId}> recorded a match: ${playersText} ${
      match.winnerScore
    } : ${match.loserScore}`
  });

  const getConfirmationMessage = match => {
    // get team
    let playersText;
    if (match.mode === '2vs2') {
      return Promise.all(
        db.getPlayersByTeamId(match.team1Id),
        db.getPlayersByTeamId(match.team2Id)
      ).then(teams => {
        const [team1, team2] = teams;
        playersText = `<@${team1[0].id}>,  vs <@${team2[0].id}>`;
        return createConfirmationMessage(playersText, match);
      });
    }
    playersText = `<@${match.team1Id}> vs <@${match.team2Id}>`;
    return Promise.resolve(createConfirmationMessage(playersText, match));
  };

  const getMatchRecordNotificationMessage = (userId, match) => {
    // get team
    let playersText;
    if (match.mode === '2vs2') {
      return Promise.all(
        db.getPlayersByTeamId(match.team1Id),
        db.getPlayersByTeamId(match.team2Id)
      ).then(teams => {
        const [team1, team2] = teams;
        playersText = `<@${team1[0].id}>, <@${team1[1].id}> vs <@${
          team2[0].id
        }>, <@${team2[1].id}>`;
        return createMatchRecordNotificationMessage(userId, playersText, match);
      });
    }
    playersText = `<@${match.team1Id}> vs <@${match.team2Id}>`;
    return Promise.resolve(
      createMatchRecordNotificationMessage(userId, playersText, match)
    );
  };

  const saveMatch = ({ players, score, slackTeamId, slackUserId }) => {
    if (players.length === 4) {
      // create teams if not existing
      return {};
    }
    // create users if not exists
    // TODO: start account binding process
    return Promise.all(
      players.map(playerId =>
        db.createUser({
          playerId,
          slackTeamId
        })
      )
    )
      .then(() =>
        db.createMatch({
          slackTeamId,
          createdBy: slackUserId,
          team1Id: players[0],
          team2Id: players[1],
          mode: '1vs1',
          winner: score[0] > score[1] ? players[0] : players[1],
          winnerScore: score[0] > score[1] ? score[0] : score[1],
          loserScore: score[0] < score[1] ? score[0] : score[1],
          status: 'draft'
        })
      )
      .catch(err => Promise.reject(err))
      .then(match => {
        log.debug('Match saved:', match);
        return match;
      })
      .catch(err => {
        log.error(err);
        throw new Error(err);
      });
  };

  // setup slackMessages
  slackMessages.action('confirm_match', (payload, respond) => {
    log.info('Incoming match confirmation', payload);
    const submitValue = payload.actions[0].value;
    const responseUrl = payload.response_url;
    let matchId;
    if (submitValue.startsWith('confirm')) {
      matchId = [...submitValue.split('confirm_')].pop();

      return http
        .post(responseUrl, {
          text: 'Waiting for match to be recorded ...'
        })
        .then(() =>
          db.updateMatchStatus({
            id: matchId,
            data: { status: 'confirmed' }
          })
        )
        .then(match => {
          log.debug('Match status updated', match);
          return getMatchRecordNotificationMessage(payload.user.id, match);
        })
        .then(message => http.post(webhookUrl, message))
        .then(() =>
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
          })
        )
        .catch(err => {
          log.error(err);
          return respond({
            text: 'Argh, could not confirm match.'
          });
        });
    }
    matchId = [...submitValue.split('cancel_')].pop();
    return db
      .deleteMatch(matchId)
      .then(() => log.info('Match deleted:', matchId))
      .catch(err => log.error('Could not delete match', err));

    // TODO: early return
    // return {
    //   text: 'Match recording cancelled.'
    // };
  });
  return {
    getConfirmationMessage,
    getMatchRecordNotificationMessage,
    saveMatch
  };
};
