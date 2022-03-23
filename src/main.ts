import 'reflect-metadata';
import 'moment-duration-format';

import { RewriteFrames } from '@sentry/integrations';
import { Client } from './bot/struct/Client';
import { execSync } from 'child_process';
import * as Sentry from '@sentry/node';
import i18next from 'i18next';

const client = new Client();

await i18next.init({
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
			new RewriteFrames({ root: process.cwd(), prefix: '/' }),
			new Sentry.Integrations.Http({ tracing: true, breadcrumbs: false })
		]
	});
}

client.on('error', (error) => {
	console.error(error);
	Sentry.captureException(error);
});

client.on('warn', (warn) => {
	console.warn(warn);
	Sentry.captureMessage(warn);
});

process.on('unhandledRejection', (error) => {
	console.error(error);
	Sentry.captureException(error);
});

await client.init(process.env.TOKEN!);
