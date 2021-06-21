import { __rootdir__ } from '../root';
import '../src/bot/util/Extension';
import Env from 'dotenv';
Env.config();

// @ts-ignore
import Auth from '../auth';
Auth.config();

import { RewriteFrames } from '@sentry/integrations';
import { version } from '../package.json';
import Client from './bot/struct/Client';
import * as Sentry from '@sentry/node';

const client = new Client({ owner: process.env.OWNER });

if (process.env.SENTRY) {
	Sentry.init({
		release: version,
		dsn: process.env.SENTRY,
		serverName: 'clashperk_bot',
		environment: process.env.NODE_ENV ?? 'development',
		integrations: [
			new RewriteFrames({ root: __rootdir__, prefix: '/' }),
			new Sentry.Integrations.Http({ tracing: true, breadcrumbs: false })
		]
	});
}

client.on('error', error => {
	Sentry.captureException(error);
	client.logger.error(error, { label: 'CLIENT_ERROR' });
});

client.on('warn', warn => {
	Sentry.captureMessage(warn);
	client.logger.warn(warn, { label: 'CLIENT_WARN' });
});

process.on('unhandledRejection', error => {
	Sentry.captureException(error);
	client.logger.error(error?.toString(), { label: 'UNHANDLED_REJECTION' });
});

client.start(process.env.TOKEN!);
