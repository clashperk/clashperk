import Env from 'dotenv';
Env.config();

import Auth from '../auth';
Auth.config();

import Client from './bot/struct/Client';
import { version } from '../package.json';
import * as Sentry from '@sentry/node';

const client = new Client({ owner: process.env.OWNER });

if (process.env.SENTRY) {
	Sentry.init({
		release: version,
		dsn: process.env.SENTRY,
		environment: process.env.NODE_ENV ?? 'development',
		integrations: [new Sentry.Integrations.Http({ tracing: true, breadcrumbs: true })]
	});
}

client.on('error', (error: any) => client.logger.error(error, { label: 'CLIENT ERROR' }));
client.on('warn', (warn: any) => client.logger.warn(warn, { label: 'CLIENT WARN' }));

client.start(process.env.TOKEN!);

process.on('unhandledRejection', error => client.logger.error(error, { label: 'UNHANDLED REJECTION' }));
