import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const FLAG_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'flag',
  description: command.flag.description,
  dm_permission: false,
  description_localizations: translation('command.flag.description'),
  options: [
    {
      name: 'create',
      description: command.flag.create.description,
      description_localizations: translation('command.flag.create.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'flag_type',
          description: command.flag.options.flag_type.description,
          description_localizations: translation('command.flag.options.flag_type.description'),
          required: true,
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.flag.ban,
              name_localizations: translation('common.choices.flag.ban'),
              value: 'ban'
            },
            {
              name: common.choices.flag.strike,
              name_localizations: translation('common.choices.flag.strike'),
              value: 'strike'
            }
          ]
        },
        {
          name: 'player',
          description: command.flag.create.options.tag.description,
          description_localizations: translation('command.flag.create.options.tag.description'),
          required: true,
          max_length: 256,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'reason',
          description: command.flag.create.options.reason.description,
          description_localizations: translation('command.flag.create.options.reason.description'),
          required: true,
          max_length: 256,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'dm_user',
          description: command.flag.create.options.dm_user.description,
          description_localizations: translation('command.flag.create.options.dm_user.description'),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'flag_expiry_days',
          description: command.flag.create.options.flag_expiry_days.description,
          description_localizations: translation('command.flag.create.options.flag_expiry_days.description'),
          type: ApplicationCommandOptionType.Integer,
          max_value: 100 * 365,
          min_value: 1
        },
        {
          name: 'flag_impact',
          description: command.flag.create.options.flag_impact.description,
          description_localizations: translation('command.flag.create.options.flag_impact.description'),
          type: ApplicationCommandOptionType.Integer,
          max_value: 100,
          min_value: 1
        }
      ]
    },
    {
      name: 'list',
      description: command.flag.list.description,
      description_localizations: translation('command.flag.list.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'flag_type',
          description: command.flag.options.flag_type.description,
          description_localizations: translation('command.flag.options.flag_type.description'),
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            {
              name: common.choices.flag.ban,
              name_localizations: translation('common.choices.flag.ban'),
              value: 'ban'
            },
            {
              name: common.choices.flag.strike,
              name_localizations: translation('common.choices.flag.strike'),
              value: 'strike'
            }
          ]
        },
        {
          name: 'player',
          description: command.flag.list.options.player.description,
          description_localizations: translation('command.flag.list.options.player.description'),
          autocomplete: true,
          max_length: 100,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'clans',
          autocomplete: true,
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'delete',
      description: command.flag.delete.description,
      description_localizations: translation('command.flag.delete.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'flag_type',
          description: command.flag.options.flag_type.description,
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            {
              name: common.choices.flag.ban,
              name_localizations: translation('common.choices.flag.ban'),
              value: 'ban'
            },
            {
              name: common.choices.flag.strike,
              name_localizations: translation('common.choices.flag.strike'),
              value: 'strike'
            }
          ]
        },
        {
          name: 'player',
          description: command.flag.delete.options.tag.description,
          description_localizations: translation('command.flag.delete.options.tag.description'),
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        },
        {
          name: 'flag_ref',
          description: command.flag.delete.options.flag_ref.description,
          description_localizations: translation('command.flag.delete.options.flag_ref.description'),
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        },
        {
          name: 'clan',
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        }
      ]
    }
  ]
};
