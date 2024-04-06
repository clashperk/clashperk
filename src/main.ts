import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/node';
import { DiscordAPIError } from 'discord.js';
import i18next from 'i18next';
import 'moment-duration-format';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import 'reflect-metadata';
import { defaultOptions } from '../locales/index.js';
import { Client } from './bot/struct/Client.js';
import { Backend } from './bot/util/Backend.js';

const client = new Client();

const locales = new URL('../locales/{{lng}}/{{ns}}.json', import.meta.url);
await i18next.use(Backend).init({
	...defaultOptions,
	backend: { paths: [fileURLToPath(locales)] }
});

if (process.env.SENTRY && process.env.GIT_SHA) {
	Sentry.init({
		dsn: process.env.SENTRY,
		serverName: process.env.SERVICE_NAME ?? 'clashperk_bot',
		environment: process.env.NODE_ENV ?? 'development',
		release: process.env.GIT_SHA,
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
			new Sentry.Integrations.Http({ tracing: false, breadcrumbs: false })
		]
	});
}

client.on('error', (error) => {
	console.error(inspect(error, { depth: Infinity }));
	Sentry.captureException(error);
});

client.on('warn', (warn) => {
	console.error(inspect(warn, { depth: Infinity }));
	Sentry.captureMessage(warn);
});

process.on('unhandledRejection', (error: DiscordAPIError) => {
	console.error(inspect(error, { depth: Infinity }));
	Sentry.captureException(error);
});

process.once('SIGTERM', () => client.close());
process.once('SIGINT', () => client.close());

client.init(process.env.TOKEN!);
