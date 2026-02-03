import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { channelTypes, translation } from './@helper.js';

export const SETUP_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'setup',
  description: command.setup.description,
  description_localizations: translation('command.setup.description'),
  dm_permission: false,
  options: [
    // enable
    {
      name: 'enable',
      description: 'This command has been replaced with /setup clan and /setup clan-embed',
      type: ApplicationCommandOptionType.Subcommand
    },
    // clan
    {
      name: 'clan',
      description: command.setup.clan.description,
      description_localizations: translation('command.setup.clan.description'),
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
          name: 'category',
          description: command.setup.enable.options.category.description,
          description_localizations: translation(
            'command.setup.enable.options.category.description'
          ),
          type: ApplicationCommandOptionType.String,
          max_length: 36,
          autocomplete: true
        },
        {
          name: 'clan_channel',
          description: command.setup.enable.options.channel.description,
          description_localizations: translation(
            'command.setup.enable.options.channel.description'
          ),
          type: ApplicationCommandOptionType.Channel,
          channel_types: channelTypes
        },
        {
          name: 'unlink_clan_channel',
          description: command.setup.clan.options.unlink_clan_channel.description,
          description_localizations: translation(
            'command.setup.clan.options.unlink_clan_channel.description'
          ),
          type: ApplicationCommandOptionType.Channel,
          channel_types: channelTypes
        },
        {
          name: 'unlink_clan',
          description: command.setup.clan.options.unlink_clan.description,
          description_localizations: translation(
            'command.setup.clan.options.unlink_clan.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        }
      ]
    },
    // clan-embed
    {
      name: 'clan-embed',
      description: command.setup.clan_embed.description,
      description_localizations: translation('command.setup.clan_embed.description'),
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
          name: 'channel',
          description: command.setup.enable.options.channel.description,
          description_localizations: translation(
            'command.setup.enable.options.channel.description'
          ),
          type: ApplicationCommandOptionType.Channel,
          channel_types: channelTypes
        },
        {
          name: 'color',
          name_localizations: { 'en-GB': 'colour' },
          description: command.setup.enable.options.color.description,
          description_localizations: translation('command.setup.enable.options.color.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'disable_embed',
          description: command.setup.clan_embed.options.disable_embed.description,
          description_localizations: translation(
            'command.setup.clan_embed.options.disable_embed.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        }
      ]
    },
    // list
    {
      name: 'list',
      description: command.setup.list.description,
      description_localizations: translation('command.setup.list.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: command.setup.list.options.clans.description,
          description_localizations: translation('command.setup.list.options.clans.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        }
      ]
    },
    // buttons
    {
      name: 'buttons',
      description: command.setup.buttons.description,
      description_localizations: translation('command.setup.buttons.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'button_type',
          required: true,
          description: command.setup.buttons.options.button_type.description,
          description_localizations: translation(
            'command.setup.buttons.options.button_type.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.link_button,
              name_localizations: translation('common.choices.link_button'),
              value: 'link-button'
            },
            {
              name: common.choices.role_refresh_button,
              name_localizations: translation('common.choices.role_refresh_button'),
              value: 'role-refresh-button'
            },
            {
              name: common.choices.my_rosters_button,
              name_localizations: translation('common.choices.my_rosters_button'),
              value: 'my-rosters-button'
            }
          ]
        },
        {
          name: 'embed_color',
          description: command.setup.buttons.options.embed_color.description,
          description_localizations: translation(
            'command.setup.buttons.options.embed_color.description'
          ),
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    // events
    {
      name: 'events',
      description: command.setup.events.description,
      description_localizations: translation('command.setup.events.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'disable',
          description: command.setup.events.options.disable.description,
          description_localizations: translation(
            'command.setup.events.options.disable.description'
          ),
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            {
              name: common.choices.yes,
              name_localizations: translation('common.choices.yes'),
              value: 'true'
            },
            {
              name: common.choices.no,
              name_localizations: translation('common.choices.no'),
              value: 'false'
            }
          ]
        }
      ]
    },
    // server-logs
    {
      name: 'server-logs',
      description: command.setup.server_logs.description,
      description_localizations: translation('command.setup.server_logs.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'log_type',
          required: true,
          description: command.setup.server_logs.options.log_type.description,
          description_localizations: translation(
            'command.setup.server_logs.options.log_type.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.flag_alert_log,
              name_localizations: translation('common.choices.flag_alert_log'),
              value: 'flag-alert-log'
            },
            {
              name: common.choices.roster_change_log,
              name_localizations: translation('common.choices.roster_change_log'),
              value: 'roster-changelog'
            },
            {
              name: common.choices.maintenance_break_log,
              name_localizations: translation('common.choices.maintenance_break_log'),
              value: 'maintenance-break-log'
            },
            {
              name: common.choices.welcome_log,
              name_localizations: translation('common.choices.welcome_log'),
              value: 'welcome-log'
            }
          ]
        },
        {
          name: 'disable',
          description: command.setup.server_logs.options.disable.description,
          description_localizations: translation(
            'command.setup.server_logs.options.disable.description'
          ),
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            {
              name: common.choices.yes,
              name_localizations: translation('common.choices.yes'),
              value: 'true'
            },
            {
              name: common.choices.no,
              name_localizations: translation('common.choices.no'),
              value: 'false'
            }
          ]
        }
      ]
    },
    // clan-logs
    {
      name: 'clan-logs',
      description: command.setup.clan_logs.description,
      description_localizations: translation('command.setup.clan_logs.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clan',
          description: command.setup.clan_logs.options.clan.description,
          description_localizations: translation(
            'command.setup.clan_logs.options.clan.description'
          ),
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'action',
          description: command.setup.clan_logs.options.action.description,
          description_localizations: translation(
            'command.setup.clan_logs.options.action.description'
          ),
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            {
              name: common.choices.enable,
              name_localizations: translation('common.choices.enable'),
              value: 'enable-logs'
            },
            {
              name: common.choices.disable,
              name_localizations: translation('common.choices.disable'),
              value: 'disable-logs'
            }
          ]
        },
        {
          name: 'channel',
          description: command.setup.enable.options.channel.description,
          description_localizations: translation(
            'command.setup.enable.options.channel.description'
          ),
          type: ApplicationCommandOptionType.Channel,
          channel_types: channelTypes
        },
        {
          name: 'color',
          name_localizations: {
            'en-GB': 'colour'
          },
          description: command.setup.enable.options.color.description,
          description_localizations: translation('command.setup.enable.options.color.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'ping_role',
          description: 'Ping this role in the logs (only for town hall upgrade log)',
          type: ApplicationCommandOptionType.Role
        }
      ]
    },
    // disable
    {
      name: 'disable',
      description: 'This command has been replaced with /setup clan and /setup clan-embed',
      type: ApplicationCommandOptionType.Subcommand
    },
    // custom-bot
    {
      name: 'custom-bot',
      description: command.setup.custom_bot.description,
      description_localizations: translation('command.setup.custom_bot.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'delete_custom_bot',
          description: command.setup.custom_bot.options.delete_custom_bot.description,
          description_localizations: translation(
            'command.setup.custom_bot.options.delete_custom_bot.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        }
      ]
    }
  ]
};
