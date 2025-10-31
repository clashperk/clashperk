import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const CONFIG_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'config',
  description: command.config.description,
  dm_permission: false,
  description_localizations: translation('command.config.description'),
  options: [
    {
      name: 'bot_manager_role',
      description: command.config.options.manager_role.description,
      description_localizations: translation('command.config.options.manager_role.description'),
      type: ApplicationCommandOptionType.Role
    },
    {
      name: 'roster_manager_role',
      description: command.config.options.roster_manager_role.description,
      description_localizations: translation('command.config.options.roster_manager_role.description'),
      type: ApplicationCommandOptionType.Role
    },
    {
      name: 'flags_manager_role',
      description: command.config.options.flags_manager_role.description,
      description_localizations: translation('command.config.options.flags_manager_role.description'),
      type: ApplicationCommandOptionType.Role
    },
    {
      name: 'links_manager_role',
      description: command.config.options.links_manager_role.description,
      description_localizations: translation('command.config.options.links_manager_role.description'),
      type: ApplicationCommandOptionType.Role
    },
    {
      name: 'color_code',
      name_localizations: {
        'en-GB': 'colour_code'
      },
      description: command.config.options.color_code.description,
      description_localizations: translation('command.config.options.color_code.description'),
      type: ApplicationCommandOptionType.String
    },
    {
      name: 'webhook_limit',
      description: command.config.options.webhook_limit.description,
      description_localizations: translation('command.config.options.webhook_limit.description'),
      type: ApplicationCommandOptionType.Integer,
      max_value: 8,
      min_value: 3
    }
  ]
};
