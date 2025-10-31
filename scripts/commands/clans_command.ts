import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const CLANS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'clans',
  description: command.clans.description,
  description_localizations: translation('command.clans.description'),
  dm_permission: false,
  options: [
    {
      name: 'category',
      description: command.clans.options.category.description,
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      description_localizations: translation('command.clans.options.category.description')
    }
  ]
};
