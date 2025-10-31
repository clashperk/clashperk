import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const WHITELIST_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'whitelist',
  description: command.whitelist.description,
  description_localizations: translation('command.whitelist.description'),
  dm_permission: false,
  options: [
    {
      name: 'user_or_role',
      description: command.whitelist.options.user_or_role.description,
      description_localizations: translation('command.whitelist.options.user_or_role.description'),
      type: ApplicationCommandOptionType.Mentionable
    },
    {
      name: 'command',
      description: command.whitelist.options.command.description,
      description_localizations: translation('command.whitelist.options.command.description'),
      type: ApplicationCommandOptionType.String,
      autocomplete: true
    },
    {
      name: 'clear',
      description: command.whitelist.options.clear.description,
      description_localizations: translation('command.whitelist.options.clear.description'),
      type: ApplicationCommandOptionType.Boolean
    },
    {
      name: 'list',
      description: command.whitelist.options.list.description,
      description_localizations: translation('command.whitelist.options.list.description'),
      type: ApplicationCommandOptionType.Boolean
    }
  ]
};
