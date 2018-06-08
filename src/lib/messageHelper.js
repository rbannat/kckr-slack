const createConfirmationMessage = ({ resultText, matchId }) => ({
  text: `Confirm match results ${resultText} ?`,
  attachments: [
    {
      fallback: 'You are unable to confirm match',
      callback_id: 'confirm_match',
      actions: [
        {
          name: 'confirm',
          value: `confirm_${matchId}`,
          text: 'Confirm',
          type: 'button',
          style: 'primary'
        },
        {
          name: 'cancel',
          value: `cancel_${matchId}`,
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
  resultText
}) => ({
  text: `<@${createdBySlackUserId}> recorded a match: ${resultText}`
});

const getResultText = ({ slackUserIds, score }) => {
  if (slackUserIds.length === 4) {
    return `<@${slackUserIds[0]}>, <@${slackUserIds[1]}> vs <@${
      slackUserIds[2]
    }>, <@${slackUserIds[3]}> ${score[0]} : ${score[1]}`;
  }
  return `<@${slackUserIds[0]}> vs <@${slackUserIds[1]}> ${score[0]} : ${
    score[1]
  }`;
};

const getConfirmationMessage = ({ slackUserIds, score, matchId }) =>
  createConfirmationMessage({
    resultText: getResultText({ slackUserIds, score }),
    matchId
  });

const getMatchRecordNotificationMessage = ({
  createdBySlackUserId,
  slackUserIds,
  score
}) =>
  createMatchRecordNotificationMessage({
    createdBySlackUserId,
    resultText: getResultText({ slackUserIds, score })
  });

module.exports = {
  getConfirmationMessage,
  getMatchRecordNotificationMessage
};
