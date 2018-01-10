require('dotenv').config();
const env = process.env.NODE_ENV || 'development'; // 'production' or 'development'

const development = {
    app: {
        port: parseInt(process.env.DEV_PORT) || 3000
    },
    slack: {
        clientId: process.env.DEV_SLACK_CLIENT_ID,
        clientSecret: process.env.DEV_SLACK_CLIENT_SECRET,
        verificationToken: process.env.DEV_SLACK_VERIFICATION_TOKEN,
        accessToken: process.env.DEV_SLACK_ACCESS_TOKEN,
        webhookUrl: process.env.DEV_SLACK_WEBHOOK_URL,
        messageActionPath: process.env.DEV_SLACK_INTERACTIVE_MESSAGE_PATH
    },
    db: {
        teamDBPath: process.env.DEV_TEAM_DB_PATH,
        userDBPath: process.env.DEV_USER_DB_PATH
    }
};

const production = {
    app: {
        port: parseInt(process.env.PORT) || 3000
    },
    slack: {
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        verificationToken: process.env.SLACK_VERIFICATION_TOKEN,
        accessToken: process.env.SLACK_ACCESS_TOKEN,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        messageActionPath: process.env.SLACK_INTERACTIVE_MESSAGE_PATH
    },
    db: {
        teamDBPath: process.env.TEAM_DB_PATH,
        userDBPath: process.env.USER_DB_PATH
    }
};

const config = {
    development,
    production
};

module.exports = config[env];