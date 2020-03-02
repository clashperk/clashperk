const api = require('../auth');
api.config();

const Client = require('./app/client/ClashPerk');
const Sentry = require('@sentry/node');
const package = require('../package.json');

const client = new Client({ owner: process.env.OWNER });

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
