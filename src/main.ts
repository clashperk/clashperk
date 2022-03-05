import { __rootdir__ } from '../root';
import '../src/bot/util/Extension';
import Env from 'dotenv';
Env.config();

// @ts-ignore
import Auth from '../auth';
Auth.config();

import { RewriteFrames } from '@sentry/integrations';
import { execSync } from 'child_process';
import Client from './bot/struct/Client';
import * as Sentry from '@sentry/node';
import i18next from 'i18next';

const client = new Client({ owner: process.env.OWNER! });

i18next.init({
	debug: false,
	cleanCode: true,
	fallbackLng: ['en-US'],
	defaultNS: 'translation',
	lng: 'en-US',
	ns: ['translation'],
	resources: {
		'en-US': {
			translation: {
				key: 'hello world'
			}
		},
		'es-ES': {
			translation: {
				key: 'hola mundo'
			}
		}
	}
});

if (process.env.SENTRY) {
	Sentry.init({
		dsn: process.env.SENTRY,
		serverName: 'clashperk_bot',
		environment: process.env.NODE_ENV ?? 'development',
		release: execSync('git rev-parse HEAD').toString().trim(),
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
	client.logger.error(error, { label: 'UNHANDLED_REJECTION' });
});

client.start(process.env.TOKEN!);
