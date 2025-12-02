import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const LINK_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'link',
  description: command.link.description,
  dm_permission: false,
  description_localizations: translation('command.link.description'),
  options: [
    {
      name: 'create',
      description: command.link.create.description,
      description_localizations: translation('command.link.create.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player_tag',
          description: command.link.create.options.player_tag.description,
          description_localizations: translation(
            'command.link.create.options.player_tag.description'
          ),
          required: false,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'clan_tag',
          description: command.link.create.options.clan_tag.description,
          description_localizations: translation(
            'command.link.create.options.clan_tag.description'
          ),
          required: false,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'user',
          description: command.link.create.options.user.description,
          description_localizations: translation('command.link.create.options.user.description'),
          type: ApplicationCommandOptionType.User
        },
        {
          name: 'is_default',
          description: command.link.create.options.is_default.description,
          description_localizations: translation(
            'command.link.create.options.is_default.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: 'Yes',
              name_localizations: translation('common.choices.yes'),
              value: 'true'
            },
            {
              name: 'No',
              name_localizations: translation('common.choices.no'),
              value: 'false'
            }
          ]
        }
      ]
    },
    {
      name: 'list',
      description: command.link.list.description,
      description_localizations: translation('command.link.list.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clan',
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        }
      ]
    },
    {
      name: 'delete',
      description: command.link.delete.description,
      description_localizations: translation('command.link.delete.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player_tag',
          description: command.link.delete.options.player_tag.description,
          description_localizations: translation(
            'command.link.delete.options.player_tag.description'
          ),
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'clan_tag',
          description: command.link.delete.options.clan_tag.description,
          description_localizations: translation(
            'command.link.delete.options.clan_tag.description'
          ),
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        }
      ]
    }
  ]
};
