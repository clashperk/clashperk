import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { getRaidWeekIds, getSeasonIds, getSeasonSinceIds, translation } from './@helper.js';

export const SUMMARY_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'summary',
  description: command.summary.description,
  description_localizations: translation('command.summary.description'),
  dm_permission: false,
  options: [
    {
      name: 'best',
      description: command.summary.best.description,
      description_localizations: translation('command.summary.best.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        },
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'limit',
          required: false,
          type: ApplicationCommandOptionType.Integer,
          description: command.summary.best.options.limit.description,
          description_localizations: translation('command.summary.best.options.limit.description'),
          min_value: 3,
          max_value: 10
        },
        {
          name: 'order',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: command.summary.best.options.order.description,
          description_localizations: translation('command.summary.best.options.order.description'),
          choices: [
            {
              name: common.choices.desc,
              name_localizations: translation('common.choices.desc'),
              value: 'desc'
            },
            {
              name: common.choices.asc,
              name_localizations: translation('common.choices.asc'),
              value: 'asc'
            }
          ]
        }
      ]
    },
    {
      name: 'wars',
      description: command.summary.wars.description,
      description_localizations: translation('command.summary.wars.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        }
      ]
    },
    {
      name: 'compo',
      description: command.summary.compo.description,
      description_localizations: translation('command.summary.compo.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        }
      ]
    },
    {
      name: 'cwl-ranks',
      description: command.summary.cwl_ranks.description,
      description_localizations: translation('command.summary.cwl_ranks.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        }
      ]
    },
    {
      name: 'cwl-status',
      description: command.summary.cwl_status.description,
      description_localizations: translation('command.summary.cwl_status.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        }
      ]
    },
    {
      name: 'leagues',
      description: command.summary.leagues.description,
      description_localizations: translation('command.summary.leagues.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        }
      ]
    },
    {
      name: 'donations',
      description: command.summary.donations.description,
      description_localizations: translation('command.summary.donations.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        }
      ]
    },
    {
      name: 'clans',
      description: command.summary.clans.description,
      description_localizations: translation('command.summary.clans.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        }
      ]
    },
    {
      name: 'attacks',
      description: command.summary.attacks.description,
      description_localizations: translation('command.summary.attacks.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        },
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          choices: getSeasonIds()
        }
      ]
    },
    {
      name: 'trophies',
      description: command.summary.trophies.description,
      description_localizations: translation('command.summary.trophies.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        },
        {
          name: 'limit',
          required: false,
          type: ApplicationCommandOptionType.Integer,
          description: command.summary.trophies.options.limit.description,
          description_localizations: translation(
            'command.summary.trophies.options.limit.description'
          )
        }
      ]
    },
    {
      name: 'war-results',
      description: command.summary.war_results.description,
      description_localizations: translation('command.summary.war_results.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        },
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          choices: getSeasonIds()
        }
      ]
    },
    {
      name: 'missed-wars',
      description: command.summary.missed_wars.description,
      description_localizations: translation('command.summary.missed_wars.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        },
        {
          name: 'war_type',
          description: 'Regular, CWL or Friendly Wars (defaults to Regular)',
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
              value: 'regular-and-cwl'
            }
          ]
        },
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season_since.description,
          description_localizations: translation('common.options.season_since.description'),
          choices: getSeasonSinceIds()
        }
      ]
    },
    {
      name: 'capital-raids',
      description: command.summary.capital_raids.description,
      description_localizations: translation('command.summary.capital_raids.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        },
        {
          name: 'week',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.week.description,
          description_localizations: translation('common.options.week.description'),
          choices: getRaidWeekIds()
        }
      ]
    },
    {
      name: 'capital-contribution',
      description: command.summary.capital_contribution.description,
      description_localizations: translation('command.summary.capital_contribution.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        },
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'week',
          description: command.summary.capital_contribution.options.week.description,
          description_localizations: translation(
            'command.summary.capital_contribution.options.week.description'
          ),
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: getRaidWeekIds()
        }
      ]
    },
    {
      name: 'activity',
      description: command.summary.activity.description,
      description_localizations: translation('command.summary.activity.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        },
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          choices: getSeasonIds()
        }
      ]
    },
    {
      name: 'clan-games',
      description: command.summary.clan_games.description,
      description_localizations: translation('command.summary.clan_games.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'clans',
          required: false,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: common.options.clan.tag.description,
          description_localizations: translation('common.options.clan.tag.description')
        }
      ]
    }
  ]
};
