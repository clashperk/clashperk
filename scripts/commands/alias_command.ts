import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const ALIAS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'alias',
  description: command.alias.description,
  dm_permission: false,
  description_localizations: translation('command.alias.description'),
  options: [
    {
      name: 'create',
      description: command.alias.create.description,
      description_localizations: translation('command.alias.create.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clan',
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description'),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'alias_name',
          required: false,
          max_length: 15,
          description: command.alias.create.options.alias_name.description,
          description_localizations: translation('command.alias.create.options.alias_name.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'clan_nickname',
          required: false,
          max_length: 15,
          description: command.alias.create.options.clan_nickname.description,
          description_localizations: translation('command.alias.create.options.clan_nickname.description'),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'list',
      description: command.alias.list.description,
      description_localizations: translation('command.alias.list.description'),
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: 'delete',
      description: command.alias.delete.description,
      description_localizations: translation('command.alias.delete.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'alias',
          description: command.alias.delete.options.name.description,
          description_localizations: translation('command.alias.delete.options.name.description'),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        }
      ]
    }
  ]
};
