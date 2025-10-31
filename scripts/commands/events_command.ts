import { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const EVENTS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'events',
  description: command.events.description,
  description_localizations: translation('command.events.description'),
  dm_permission: true
};
