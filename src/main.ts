import 'reflect-metadata';
import 'moment-duration-format';

import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/node';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { Client } from './bot/struct/Client';

const client = new Client();

const locales = new URL('../locales/{{lng}}/{{ns}}.json', import.meta.url);
await i18next.use(Backend).init({
	debug: false,
	cleanCode: true,
	lng: 'en-US',
	fallbackLng: {
		fr: ['fr-FR', 'en-US'], // French/Français
		it: ['it-IT', 'en-US'], // Italian/Italiano
		de: ['de-DE', 'en-US'], // German/Deutsch
		no: ['no-NO', 'en-US'], // Norwegian/Norsk
		nl: ['nl-NL', 'en-US'] // Dutch/Nederlands
	},
	preload: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'nl-NL', 'it-IT', 'de-DE', 'no-NO'],
	defaultNS: 'translation',
	ns: ['translation'],
	backend: { loadPath: fileURLToPath(locales) }
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
