import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { getSeasonIds, getSeasonSinceIds, translation } from './@helper.js';

export const EXPORT_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'export',
  description: command.export.description,
  dm_permission: false,
  description_localizations: translation('command.export.description'),
  options: [
    {
      name: 'wars',
      description: command.export.wars.description,
      description_localizations: translation('command.export.options.wars.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
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
          name: 'start_date',
          description: common.options.start_date.description,
          description_localizations: translation('common.options.start_date.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'end_date',
          description: common.options.end_date.description,
          description_localizations: translation('common.options.end_date.description'),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'limit',
          min_value: 1,
          max_value: 120,
          description: command.export.options.wars.description,
          description_localizations: translation('command.export.options.wars.description'),
          type: ApplicationCommandOptionType.Integer
        }
      ]
    },
    {
      name: 'cwl',
      description: command.export.cwl.description,
      description_localizations: translation('command.export.cwl.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'season',
          description: common.options.season_since.description,
          description_localizations: translation('common.options.season_since.description'),
          type: ApplicationCommandOptionType.String,
          choices: getSeasonIds()
        },
        {
          name: 'wars',
          min_value: 1,
          max_value: 100,
          description: command.export.options.wars.description,
          description_localizations: translation('command.export.options.wars.description'),
          type: ApplicationCommandOptionType.Integer
        },
        {
          name: 'lineup_only',
          description: command.export.cwl.options.lineup_only.description,
          description_localizations: translation(
            'command.export.cwl.options.lineup_only.description'
          ),
          type: ApplicationCommandOptionType.Boolean
        }
      ]
    },
    {
      name: 'season',
      description: command.export.season.description,
      description_localizations: translation('command.export.season.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'season',
          description: common.options.season_since.description,
          description_localizations: translation('common.options.season_since.description'),
          type: ApplicationCommandOptionType.String,
          choices: getSeasonIds()
        },
        {
          name: 'include_past_members',
          description: common.options.include_past_members.description,
          description_localizations: translation('common.options.include_past_members.description'),
          type: ApplicationCommandOptionType.Boolean
        }
      ]
    },
    {
      name: 'members',
      description: command.export.members.description,
      description_localizations: translation('command.export.members.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'season',
          description: common.options.season_since.description,
          description_localizations: translation('common.options.season_since.description'),
          type: ApplicationCommandOptionType.String,
          choices: getSeasonIds()
        }
      ]
    },
    {
      name: 'clans',
      description: command.export.clans.description,
      description_localizations: translation('command.export.clans.description'),
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: 'users',
      description: command.export.users.description,
      description_localizations: translation('command.export.users.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'role',
          description: command.export.users.options.role.description,
          description_localizations: translation('command.export.users.options.role.description'),
          type: ApplicationCommandOptionType.Role
        }
      ]
    },
    {
      name: 'attack-log',
      description: command.export.attack_log.description,
      description_localizations: translation('command.export.attack_log.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'war_type',
          description: command.export.wars.options.war_type.description,
          description_localizations: translation(
            'command.export.wars.options.war_type.description'
          ),
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
            }
          ]
        },
        {
          name: 'limit',
          min_value: 1,
          max_value: 100,
          description: command.export.options.wars.description,
          description_localizations: translation('command.export.options.wars.description'),
          type: ApplicationCommandOptionType.Integer
        }
      ]
    },
    {
      name: 'missed',
      description: command.export.missed.description,
      description_localizations: translation('command.export.missed.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
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
          description: common.options.season_since.description,
          description_localizations: translation('common.options.season_since.description'),
          type: ApplicationCommandOptionType.String,
          choices: getSeasonSinceIds()
        },
        {
          name: 'limit',
          min_value: 1,
          max_value: 100,
          description: command.export.options.wars.description,
          description_localizations: translation('command.export.options.wars.description'),
          type: ApplicationCommandOptionType.Integer
        }
      ]
    },
    {
      name: 'capital-raids',
      description: command.export.capital_raids.description,
      description_localizations: translation('command.export.capital_raids.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'limit',
          description: command.export.capital_raids.options.limit.description,
          max_value: 52,
          min_value: 1,
          description_localizations: translation(
            'command.export.capital_raids.options.limit.description'
          ),
          type: ApplicationCommandOptionType.Integer
        }
      ]
    },
    {
      name: 'last-wars',
      description: command.export.last_wars.description,
      description_localizations: translation('command.export.last_wars.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'war_type',
          description: command.export.last_wars.options.war_type.description,
          description_localizations: translation(
            'command.export.last_wars.options.war_type.description'
          ),
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
            }
          ]
        },
        {
          name: 'season',
          description: common.options.season_since.description,
          description_localizations: translation('common.options.season_since.description'),
          type: ApplicationCommandOptionType.String,
          choices: getSeasonIds()
        },
        {
          name: 'limit',
          description: command.export.options.wars.description,
          description_localizations: translation('command.export.options.wars.description'),
          type: ApplicationCommandOptionType.Integer
        }
      ]
    },
    {
      name: 'capital',
      description: command.export.capital.description,
      description_localizations: translation('command.export.capital.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          autocomplete: true,
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'rosters',
      description: command.export.rosters.description,
      description_localizations: translation('command.export.rosters.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'category',
          description: command.export.rosters.options.category.description,
          description_localizations: translation(
            'command.export.rosters.options.category.description'
          ),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.cwl,
              name_localizations: translation('common.choices.cwl'),
              value: 'CWL'
            },
            {
              name: common.choices.war,
              name_localizations: translation('common.choices.war'),
              value: 'WAR'
            },
            {
              name: common.choices.e_sports,
              name_localizations: translation('common.choices.e_sports'),
              value: 'ESPORTS'
            }
          ]
        }
      ]
    }
  ]
};
