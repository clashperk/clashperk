import 'reflect-metadata';
import 'moment-duration-format';

import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/node';
import i18next from 'i18next';
import { defaultOptions } from '../locales/index.js';
import { Client } from './bot/struct/Client.js';
import { Backend } from './bot/util/Backend.js';

const client = new Client();

const locales = new URL('../locales/{{lng}}/{{ns}}.json', import.meta.url);
await i18next.use(Backend).init({
	...defaultOptions,
	backend: { paths: [fileURLToPath(locales)] }
});

if (process.env.SENTRY) {
	Sentry.init({
		dsn: process.env.SENTRY,
		serverName: 'clashperk_bot',
		environment: process.env.NODE_ENV ?? 'development',
		release: execSync('git rev-parse HEAD').toString().trim(),
		integrations: [
			new RewriteFrames({
				iteratee(frame) {
					if (frame.filename) {
						const filename = frame.filename.replace(process.cwd(), '');
						frame.filename = filename.replace(/\\/g, '/');
					}
					return frame;
				}
			}),
			new Sentry.Integrations.Http({ tracing: true, breadcrumbs: true })
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
