const env = require('dotenv');
env.config();
const Client = require('./app/client/client');

const client = new Client({ owner: process.env.OWNER });

client.start(process.env.DISCORD_TOKEN);
