module.exports = () => {
  /**
   * Creates a new match.
   * @param {*} match
   */
  const createMatch = match => {
    const params = {
      TableName: MATCHES_TABLE,
      Item: {
        ...match
      }
    };
    return dynamoDb
      .put(params)
      .promise()
      .then(() => params.Item)
      .catch(err => {
        throw new Error(err);
      });
  };

  /**
   * Deletes a match.
   * @param {*} match
   */
  const deleteMatch = id => {
    const params = {
      TableName: MATCHES_TABLE,
      Key: {
        id
      }
    };
    return dynamoDb.delete(params).promise();
  };

  const updateMatchStatus = ({ id, data }) => {
    const params = {
      TableName: MATCHES_TABLE,
      Key: {
        id
      },
      UpdateExpression: 'set #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':status': data.status
      },
      ReturnValues: 'ALL_NEW'
    };
    return dynamoDb
      .update(params)
      .promise()
      .then(result => result.Attributes)
      .catch(err => {
        throw new Error(err);
      });
  };
  return {
    createMatch,
    deleteMatch,
    updateMatchStatus
  };
};
