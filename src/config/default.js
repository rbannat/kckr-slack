require('dotenv').config();

const config = {
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    verificationToken: process.env.SLACK_VERIFICATION_TOKEN,
    accessToken: process.env.SLACK_ACCESS_TOKEN,
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    messageActionPath: process.env.SLACK_INTERACTIVE_MESSAGE_PATH
  },
  kckr: {
    socketUrl: 'http://kckr.io:8090'
  },
  db: {
    dbUri: process.env.MONGODB_URI || 'mongodb://localhost/kckr-slack'
  }
};

module.exports = config;
