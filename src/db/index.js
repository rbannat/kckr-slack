const mongoose = require('mongoose');

module.exports = () => {
  const connect = uri => mongoose.connect(uri);
  const closeConnection = () => mongoose.connection.close();
  return { connect, closeConnection };
};
