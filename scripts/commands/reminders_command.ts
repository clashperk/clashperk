import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { channelTypes, translation } from './@helper.js';

export const REMINDERS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'reminders',
  description: command.reminders.description,
  dm_permission: false,
  description_localizations: translation('command.reminders.description'),
  options: [
    {
      name: 'create',
      description: command.reminders.create.description,
      description_localizations: translation('command.reminders.create.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'type',
          description: command.reminders.create.options.type.description,
          description_localizations: translation('command.reminders.create.options.type.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.clan_wars,
              name_localizations: translation('common.choices.clan_wars'),
              value: 'clan-wars'
            },
            {
              name: common.choices.capital_raids,
              name_localizations: translation('common.choices.capital_raids'),
              value: 'capital-raids'
            },
            {
              name: common.choices.clan_games,
              name_localizations: translation('common.choices.clan_games'),
              value: 'clan-games'
            }
          ],
          required: true
        },
        {
          name: 'duration',
          description: command.reminders.create.options.duration.description,
          description_localizations: translation('command.reminders.create.options.duration.description'),
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        },
        {
          name: 'clans',
          required: true,
          autocomplete: true,
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'message',
          description: command.reminders.options.message.description,
          description_localizations: translation('command.reminders.options.message.description'),
          type: ApplicationCommandOptionType.String,
          max_length: 1800,
          required: true
        },
        {
          name: 'exclude_participant_list',
          description: command.reminders.create.options.exclude_participants.description,
          description_localizations: translation('command.reminders.create.options.exclude_participants.description'),
          type: ApplicationCommandOptionType.Boolean,
          required: false
        },
        {
          name: 'channel',
          description: command.reminders.create.options.channel.description,
          description_localizations: translation('command.reminders.create.options.channel.description'),
          type: ApplicationCommandOptionType.Channel,
          channel_types: channelTypes
        }
      ]
    },
    {
      name: 'edit',
      description: command.reminders.edit.description,
      description_localizations: translation('command.reminders.edit.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'type',
          description: command.reminders.create.options.type.description,
          description_localizations: translation('command.reminders.create.options.type.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.clan_wars,
              name_localizations: translation('common.choices.clan_wars'),
              value: 'clan-wars'
            },
            {
              name: common.choices.capital_raids,
              name_localizations: translation('common.choices.capital_raids'),
              value: 'capital-raids'
            },
            {
              name: common.choices.clan_games,
              name_localizations: translation('common.choices.clan_games'),
              value: 'clan-games'
            }
          ],
          required: true
        },
        {
          name: 'id',
          required: true,
          description: command.reminders.options.reminder_id.description,
          description_localizations: translation('command.reminders.options.reminder_id.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'duration',
          description: 'Remaining duration to mention members (e.g. 6h, 12h, 1d, 2d)',
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        }
      ]
    },
    {
      name: 'list',
      description: command.reminders.list.description,
      description_localizations: translation('command.reminders.list.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'type',
          required: true,
          description: command.reminders.create.options.type.description,
          description_localizations: translation('command.reminders.create.options.type.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.clan_wars,
              name_localizations: translation('common.choices.clan_wars'),
              value: 'clan-wars'
            },
            {
              name: common.choices.capital_raids,
              name_localizations: translation('common.choices.capital_raids'),
              value: 'capital-raids'
            },
            {
              name: common.choices.clan_games,
              name_localizations: translation('common.choices.clan_games'),
              value: 'clan-games'
            }
          ]
        },
        {
          name: 'compact_list',
          description: command.reminders.list.options.compact_list.description,
          description_localizations: translation('command.reminders.list.options.compact_list.description'),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'clans',
          autocomplete: true,
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'channel',
          description: command.reminders.create.options.channel.description,
          description_localizations: translation('command.reminders.create.options.channel.description'),
          type: ApplicationCommandOptionType.Channel,
          channel_types: channelTypes
        },
        {
          name: 'reminder_id',
          description: command.reminders.list.options.reminder_id.description,
          description_localizations: translation('command.reminders.list.options.reminder_id.description'),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'delete',
      description: command.reminders.delete.description,
      description_localizations: translation('command.reminders.delete.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'type',
          description: command.reminders.create.options.type.description,
          description_localizations: translation('command.reminders.create.options.type.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.clan_wars,
              name_localizations: translation('common.choices.clan_wars'),
              value: 'clan-wars'
            },
            {
              name: common.choices.capital_raids,
              name_localizations: translation('common.choices.capital_raids'),
              value: 'capital-raids'
            },
            {
              name: common.choices.clan_games,
              name_localizations: translation('common.choices.clan_games'),
              value: 'clan-games'
            }
          ],
          required: true
        },
        {
          name: 'id',
          description: command.reminders.options.reminder_id.description,
          description_localizations: translation('command.reminders.options.reminder_id.description'),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'now',
      description: command.reminders.now.description,
      description_localizations: translation('command.reminders.now.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'type',
          description: command.reminders.create.options.type.description,
          description_localizations: translation('command.reminders.create.options.type.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.clan_wars,
              name_localizations: translation('common.choices.clan_wars'),
              value: 'clan-wars'
            },
            {
              name: common.choices.capital_raids,
              name_localizations: translation('common.choices.capital_raids'),
              value: 'capital-raids'
            },
            {
              name: common.choices.clan_games,
              name_localizations: translation('common.choices.clan_games'),
              value: 'clan-games'
            }
          ],
          required: true
        },
        {
          name: 'message',
          description: command.reminders.options.message.description,
          description_localizations: translation('command.reminders.options.message.description'),
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'clans',
          required: true,
          autocomplete: true,
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'config',
      description: command.reminders.now.description,
      description_localizations: translation('command.reminders.now.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'reminder_ping_exclusion',
          description: command.reminders.config.options.reminder_ping_exclusion.description,
          description_localizations: translation('command.reminders.config.options.reminder_ping_exclusion.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.enable,
              name_localizations: translation('common.choices.enable'),
              value: 'enable'
            },
            {
              name: common.choices.disable,
              name_localizations: translation('common.choices.disable'),
              value: 'disable'
            }
          ]
        }
      ]
    }
  ]
};
