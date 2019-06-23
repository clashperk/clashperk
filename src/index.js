const env = require('dotenv');
env.config();
const Client = require('./app/client/client');
const Logger = require('./app/util/logger');

const client = new Client({ owner: process.env.OWNER });

client.on('error', error => Logger.error(error, { level: 'CLIENT ERROR' }));
client.on('warn', warn => Logger.warn(warn, { level: 'CLIENT WARN' }));

client.start(process.env.TOKEN);

process.on('unhandledRejection', error => Logger.error(error, { level: 'UNHANDLED REJECTION' }));
