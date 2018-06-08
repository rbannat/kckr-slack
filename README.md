# Kckr Slack App

## Get Started

1.  `npm install`
1.  `mv .env-example .env`
1.  edit `.env` file
1.  start local mongodb with `mongod`
1.  `npm run watch`

## Requirements

1.  Create a new Slack app: https://api.slack.com/apps
1.  Configure the app with the following features:
    * Incoming Webhooks
    * Interactive Components
    * Slash commands

## Local development

Use [ngrok](https://ngrok.com/) to test the slack integration locally via tunnel to localhost, e.g.:
`ngrok http 4000`. Just fill in the app configuration with the generated URL.

## Deployment

Deploy the app on [Heroku](https://devcenter.heroku.com/) with the given Procfile.
