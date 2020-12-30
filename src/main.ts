import Env from 'dotenv';
Env.config();

const Auth = require('../auth.js'); // eslint-disable-line
Auth.config();

import Client from './bot/struct/Client';
import * as Sentry from '@sentry/node';
const { name, version } = require('../package.json'); // eslint-disable-line
const client = new Client({ owner: process.env.OWNER });

if (process.env.SENTRY) {
	Sentry.init({
		dsn: process.env.SENTRY,
		environment: name,
		release: version,
		integrations: [new Sentry.Integrations.Http({ tracing: true })]
	});
}

client.on('error', (error: any) => client.logger.error(error, { label: 'CLIENT ERROR' }));
client.on('warn', (warn: any) => client.logger.warn(warn, { label: 'CLIENT WARN' }));

client.start(process.env.TOKEN!);

process.on('unhandledRejection', error => client.logger.error(error, { label: 'UNHANDLED REJECTION' }));
