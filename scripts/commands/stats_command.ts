import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { getSeasonSinceIds, translation } from './@helper.js';

export const STATS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'stats',
  description: command.stats.description,
  dm_permission: false,
  description_localizations: translation('command.stats.description'),
  options: [
    {
      name: 'attacks',
      description: command.stats.attacks.description,
      description_localizations: translation('command.stats.attacks.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clan',
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description'),
          type: ApplicationCommandOptionType.String,
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
          name: 'roster',
          description: command.stats.options.roster.description,
          description_localizations: translation('command.stats.options.roster.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'compare',
          description: command.stats.options.compare.description,
          description_localizations: translation('command.stats.options.compare.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'stars',
          description: command.stats.options.stars.description,
          description_localizations: translation('command.stats.options.stars.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: '3',
              value: '==3'
            },
            {
              name: '2',
              value: '==2'
            },
            {
              name: '>= 2',
              value: '>=2'
            },
            {
              name: '1',
              value: '==1'
            },
            {
              name: '>= 1',
              value: '>=1'
            }
          ]
        },
        {
          name: 'type',
          description: command.stats.options.type.description,
          description_localizations: translation('command.stats.options.type.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.regular,
              name_localizations: translation('common.choices.regular'),
              value: 'regular'
            },
            {
              name: common.choices.cwl,
              name_localizations: translation('common.choices.cwl'),
              value: 'cwl'
            },
            {
              name: common.choices.friendly,
              name_localizations: translation('common.choices.friendly'),
              value: 'friendly'
            },
            {
              name: common.choices.regular_and_cwl,
              name_localizations: translation('common.choices.regular_and_cwl'),
              value: 'noFriendly'
            },
            {
              name: common.choices.stats.no_cwl,
              name_localizations: translation('common.choices.stats.no_cwl'),
              value: 'noCWL'
            },
            {
              name: common.choices.stats.all,
              name_localizations: translation('common.choices.stats.all'),
              value: 'all'
            }
          ]
        },
        {
          name: 'season',
          description: common.options.season_since.description,
          description_localizations: translation('common.options.season_since.description'),
          type: ApplicationCommandOptionType.String,
          choices: getSeasonSinceIds()
        },
        {
          name: 'days',
          description: command.stats.options.days.description,
          description_localizations: translation('command.stats.options.days.description'),
          type: ApplicationCommandOptionType.Integer,
          min_value: 1,
          max_value: 180
        },
        {
          name: 'wars',
          description: command.stats.options.wars.description,
          description_localizations: translation('command.stats.options.wars.description'),
          type: ApplicationCommandOptionType.Integer,
          min_value: 10,
          max_value: 300
        },
        {
          name: 'attempt',
          description: command.stats.options.attempt.description,
          description_localizations: translation('command.stats.options.attempt.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.stats.fresh,
              name_localizations: translation('common.choices.stats.fresh'),
              value: 'fresh'
            },
            {
              name: common.choices.stats.cleanup,
              name_localizations: translation('common.choices.stats.cleanup'),
              value: 'cleanup'
            }
          ]
        },
        {
          name: 'filter_farm_hits',
          description: command.stats.options.filter_farm_hits.description,
          description_localizations: translation(
            'command.stats.options.filter_farm_hits.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'clan_only',
          description: command.stats.options.clan_only.description,
          description_localizations: translation('command.stats.options.clan_only.description'),
          type: ApplicationCommandOptionType.Boolean,
          required: false
        }
      ]
    },
    {
      name: 'defense',
      name_localizations: {
        'en-GB': 'defence'
      },
      description: command.stats.defense.description,
      description_localizations: translation('command.stats.defense.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clan',
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'user',
          description: common.options.clan.user.description,
          description_localizations: translation('common.options.clan.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        },
        {
          name: 'roster',
          description: command.stats.options.roster.description,
          description_localizations: translation('command.stats.options.roster.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'compare',
          description: command.stats.options.compare.description,
          description_localizations: translation('command.stats.options.compare.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'stars',
          description: command.stats.options.stars.description,
          description_localizations: translation('command.stats.options.stars.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: '3',
              value: '==3'
            },
            {
              name: '2',
              value: '==2'
            },
            {
              name: '>= 2',
              value: '>=2'
            },
            {
              name: '1',
              value: '==1'
            },
            {
              name: '>= 1',
              value: '>=1'
            }
          ]
        },
        {
          name: 'type',
          description: command.stats.options.type.description,
          description_localizations: translation('command.stats.options.type.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.regular,
              name_localizations: translation('common.choices.regular'),
              value: 'regular'
            },
            {
              name: common.choices.cwl,
              name_localizations: translation('common.choices.cwl'),
              value: 'cwl'
            },
            {
              name: common.choices.friendly,
              name_localizations: translation('common.choices.friendly'),
              value: 'friendly'
            },
            {
              name: common.choices.regular_and_cwl,
              name_localizations: translation('common.choices.regular_and_cwl'),
              value: 'noFriendly'
            },
            {
              name: common.choices.stats.no_cwl,
              name_localizations: translation('common.choices.stats.no_cwl'),
              value: 'noCWL'
            },
            {
              name: common.choices.stats.all,
              name_localizations: translation('common.choices.stats.all'),
              value: 'all'
            }
          ]
        },
        {
          name: 'season',
          description: common.options.season_since.description,
          description_localizations: translation('common.options.season_since.description'),
          type: ApplicationCommandOptionType.String,
          choices: getSeasonSinceIds()
        },
        {
          name: 'attempt',
          description: command.stats.options.attempt.description,
          description_localizations: translation('command.stats.options.attempt.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.stats.fresh,
              name_localizations: translation('common.choices.stats.fresh'),
              value: 'fresh'
            },
            {
              name: common.choices.stats.cleanup,
              name_localizations: translation('common.choices.stats.cleanup'),
              value: 'cleanup'
            }
          ]
        },
        {
          name: 'clan_only',
          description: command.defense.options.clan_only.description,
          description_localizations: translation('command.defense.options.clan_only.description'),
          type: ApplicationCommandOptionType.Boolean,
          required: false
        }
      ]
    }
  ]
};
