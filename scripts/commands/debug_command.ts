import { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const DEBUG_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'debug',
  description: command.debug.description,
  dm_permission: false,
  description_localizations: translation('command.debug.description')
};
