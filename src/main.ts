import 'reflect-metadata';

import * as Sentry from '@sentry/node';
import { DiscordAPIError } from 'discord.js';
import i18next from 'i18next';
import 'moment-duration-format';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import { defaultOptions } from '../locales/config.js';
import { Client } from './struct/client.js';
import { Backend } from './util/i18n.backend.js';
import { sentryConfig } from './util/sentry.js';

const client = new Client();

const locales = new URL('../locales/{{lng}}/{{ns}}.json', import.meta.url);
await i18next.use(Backend).init({
  ...defaultOptions,
  backend: { paths: [fileURLToPath(locales)] }
});

if (process.env.SENTRY) {
  Sentry.init(sentryConfig);
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

await client.init(process.env.TOKEN!);
