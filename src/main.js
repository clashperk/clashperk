require('../auth').config();
require('dotenv').config();
const Client = require('./app/struct/Client');
const Sentry = require('@sentry/node');
const package = require('../package.json');
const { Guild, User } = require('discord.js');
const client = new Client({ owner: process.env.OWNER });

Object.defineProperty(Guild.prototype, 'patron', {
	// eslint-disable-next-line func-name-matching
	value: function patron() {
		return client.patron.get(this.id, 'guild', false);
	}
});

Object.defineProperty(User.prototype, 'patron', {
	// eslint-disable-next-line func-name-matching
	value: function patron() {
		return client.patron.get(this.id, 'user', false);
	}
});

if (process.env.SENTRY) {
	Sentry.init({
		dsn: process.env.SENTRY,
		environment: package.name,
		release: package.version
	});
}

client.on('error', error => client.logger.error(error, { label: 'CLIENT ERROR' }));
client.on('warn', warn => client.logger.warn(warn, { label: 'CLIENT WARN' }));

client.start(process.env.TOKEN);

process.on('unhandledRejection', error => client.logger.error(error, { label: 'UNHANDLED REJECTION' }));
