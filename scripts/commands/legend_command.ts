import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { getSeasonIds, translation } from './@helper.js';

export const LEGEND_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'legend',
  dm_permission: false,
  description: command.legend.description,
  description_localizations: translation('command.legend.description'),
  options: [
    {
      name: 'attacks',
      description: command.legend.attacks.description,
      description_localizations: translation('command.legend.attacks.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true
        },
        {
          name: 'user',
          description: common.options.player.user.description,
          description_localizations: translation('common.options.player.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        },
        {
          name: 'day',
          description: command.legend.attacks.options.day.description,
          description_localizations: translation('command.legend.attacks.options.day.description'),
          type: ApplicationCommandOptionType.Number,
          max_value: 35,
          min_value: 1,
          required: false
        }
      ]
    },
    {
      name: 'days',
      description: command.legend.days.description,
      description_localizations: translation('command.legend.days.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player',
          description: common.options.player.user.description,
          description_localizations: translation('common.options.player.user.description'),
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true
        },
        {
          name: 'user',
          description: common.options.clan.user.description,
          description_localizations: translation('common.options.clan.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        },
        {
          name: 'day',
          description: command.legend.attacks.options.day.description,
          description_localizations: translation('command.legend.attacks.options.day.description'),
          type: ApplicationCommandOptionType.Number,
          max_value: 35,
          min_value: 1,
          required: false
        }
      ]
    },
    {
      name: 'leaderboard',
      description: command.legend.leaderboard.description,
      description_localizations: translation('command.legend.leaderboard.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          autocomplete: true,
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          type: ApplicationCommandOptionType.String,
          required: false
        },
        {
          name: 'limit',
          description: command.legend.leaderboard.options.limit.description,
          description_localizations: translation(
            'command.legend.leaderboard.options.limit.description'
          ),
          type: ApplicationCommandOptionType.Number,
          max_value: 100,
          min_value: 3
        },
        {
          name: 'season',
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          type: ApplicationCommandOptionType.String,
          choices: getSeasonIds()
        },
        {
          name: 'enable_auto_updating',
          description: command.legend.leaderboard.options.enable_auto_updating.description,
          description_localizations: translation(
            'command.legend.leaderboard.options.enable_auto_updating.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.legend_leaderboard,
              name_localizations: translation('common.choices.legend_leaderboard'),
              value: 'legend-leaderboard'
            },
            {
              name: common.choices.builder_legend_leaderboard,
              name_localizations: translation('common.choices.builder_legend_leaderboard'),
              value: 'bb-legend-leaderboard'
            }
          ]
        }
      ]
    },
    {
      name: 'stats',
      description: command.legend.stats.description,
      description_localizations: translation('command.legend.stats.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'reference_date',
          description: 'The date to view the end-of-day thresholds (YYYY-MM-DD)',
          type: ApplicationCommandOptionType.String
        }
      ]
    }
  ]
};
