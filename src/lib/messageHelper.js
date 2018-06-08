const createConfirmationMessage = ({ playersText, match }) => ({
  text: `Confirm match results ${playersText} ${match.winnerScore} : ${
    match.loserScore
  } ?`,
  attachments: [
    {
      fallback: 'You are unable to confirm match',
      callback_id: 'confirm_match',
      actions: [
        {
          name: 'confirm',
          value: `confirm_${match.id}`,
          text: 'Confirm',
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

const createMatchRecordNotificationMessage = ({
  createdBySlackUserId,
  playersText,
  match
}) => ({
  text: `<@${createdBySlackUserId}> recorded a match: ${playersText} ${
    match.winnerScore
  } : ${match.loserScore}`
});

const getPlayersText = ({ slackUserIds }) => {
  if (slackUserIds.length === 4) {
    return `<@${slackUserIds[0]}>, <@${slackUserIds[1]}> vs <@${
      slackUserIds[2]
    }>, <@${slackUserIds[3]}>`;
  }
  return `<@${slackUserIds[0]}> vs <@${slackUserIds[1]}>`;
};

const getConfirmationMessage = ({ match, slackUserIds }) =>
  createConfirmationMessage({
    playersText: getPlayersText({ slackUserIds }),
    match
  });

const getMatchRecordNotificationMessage = ({
  createdBySlackUserId,
  match,
  slackUserIds
}) =>
  createMatchRecordNotificationMessage({
    createdBySlackUserId,
    playersText: getPlayersText({ slackUserIds }),
    match
  });

module.exports = {
  getConfirmationMessage,
  getMatchRecordNotificationMessage
};
