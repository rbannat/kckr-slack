module.exports = ({ log }) => {
  /**
   * Creates a new user.
   * @param {*} userInput
   */
  const createUser = ({ playerId, slackTeamId }) => {
    const params = {
      TableName: USERS_TABLE,
      Item: {
        slackUserId: playerId,
        slackTeamId
      },
      ConditionExpression:
        'attribute_not_exists(slackUserId) AND attribute_not_exists(slackTeamId)'
    };
    return dynamoDb
      .put(params)
      .promise()
      .then(() => {
        log.debug('Saved player: ', playerId);
        return playerId;
      })
      .catch(err => {
        if (err.name === 'ConditionalCheckFailedException') {
          log.debug('Returned player already in db: ', playerId);
          return playerId;
        }
        throw new Error(err);
      });
  };

  /**
   * Get a user by slack id and slack team id.
   * @param {*} slackUserId
   * @param {*} slackTeamId
   */
  const getUser = ({ slackUserId, slackTeamId }) => {
    const params = {
      TableName: USERS_TABLE,
      Key: {
        slackUserId,
        slackTeamId
      }
    };
    return dynamoDb.get(params).promise();
  };
  return { createUser, getUser };
};
