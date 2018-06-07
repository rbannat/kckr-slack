const mongoose = require('mongoose');

module.exports = () => {
  const connect = uri =>
    new Promise((resolve, reject) => {
      mongoose.connect(uri);

      const db = mongoose.connection;

      db.on('error', err => {
        reject(err);
      });

      db.once('open', () => {
        resolve();
      });
    });

  return {
    connect
  };
};
