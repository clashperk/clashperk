import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const SEARCH_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'search',
  description: command.search.description,
  dm_permission: false,
  description_localizations: translation('command.search.description'),
  options: [
    {
      name: 'name',
      description: command.search.options.name.description,
      description_localizations: translation('command.search.options.name.description'),
      type: ApplicationCommandOptionType.String
    }
  ]
};
