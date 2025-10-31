import {
  BUILDER_BASE_LEAGUE_NAMES,
  BUILDER_HALL_LEVELS_FOR_ROLES,
  PLAYER_LEAGUE_NAMES,
  TOWN_HALL_LEVELS_FOR_ROLES,
  TROPHY_ROLES
} from '@app/constants';
import { APIApplicationCommandBasicOption, ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { title } from 'radash';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const AUTOROLE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'autorole',
  description: command.autorole.description,
  description_localizations: translation('command.autorole.description'),
  dm_permission: false,
  options: [
    {
      name: 'clan-roles',
      description: command.autorole.clan_roles.description,
      description_localizations: translation('command.autorole.clan_roles.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'clans',
          required: true,
          autocomplete: true,
          description: common.options.clans.description,
          description_localizations: translation('common.options.clans.description'),
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'leader_role',
          required: false,
          description: command.autorole.clan_roles.options.leader.description,
          description_localizations: translation('command.autorole.clan_roles.options.leader.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'co_leader_role',
          required: false,
          description: command.autorole.clan_roles.options.co_lead.description,
          description_localizations: translation('command.autorole.clan_roles.options.co_lead.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'elder_role',
          required: false,
          description: command.autorole.clan_roles.options.elder.description,
          description_localizations: translation('command.autorole.clan_roles.options.elder.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'member_role',
          required: false,
          description: command.autorole.clan_roles.options.member.description,
          description_localizations: translation('command.autorole.clan_roles.options.member.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'everyone_role',
          required: false,
          description: command.autorole.clan_roles.options.common_role.description,
          description_localizations: translation('command.autorole.clan_roles.options.common_role.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'only_verified',
          required: false,
          description: command.autorole.clan_roles.options.only_verified.description,
          description_localizations: translation('command.autorole.clan_roles.options.only_verified.description'),
          type: ApplicationCommandOptionType.String,
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
    {
      name: 'town-hall',
      description: command.autorole.town_hall.description,
      description_localizations: translation('command.autorole.town_hall.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        ...TOWN_HALL_LEVELS_FOR_ROLES.map(
          (hall) =>
            ({
              name: `th_${hall}`,
              description: `Town Hall ${hall} role.`,
              type: ApplicationCommandOptionType.Role
            }) satisfies APIApplicationCommandBasicOption
        ),
        {
          name: 'allow_non_family_accounts',
          description: command.autorole.town_hall.options.allow_non_family_accounts.description,
          description_localizations: translation('command.autorole.town_hall.options.allow_non_family_accounts.description'),
          type: ApplicationCommandOptionType.String,
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
    {
      name: 'builder-hall',
      description: command.autorole.builder_hall.description,
      description_localizations: translation('command.autorole.builder_hall.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        ...BUILDER_HALL_LEVELS_FOR_ROLES.map(
          (hall) =>
            ({
              name: `bh_${hall}`,
              description: `Builder Hall ${hall} role.`,
              type: ApplicationCommandOptionType.Role
            }) satisfies APIApplicationCommandBasicOption
        )
      ]
    },
    {
      name: 'leagues',
      description: command.autorole.leagues.description,
      description_localizations: translation('command.autorole.leagues.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        ...PLAYER_LEAGUE_NAMES.map(
          (league) =>
            ({
              name: league,
              description: `${title(league)} league role.`,
              type: ApplicationCommandOptionType.Role
            }) satisfies APIApplicationCommandBasicOption
        ),
        ...TROPHY_ROLES.map(
          (range) =>
            ({
              name: `${range.min}_${range.max}`,
              description: `Trophy range ${range.min} - ${range.max} role.`,
              type: ApplicationCommandOptionType.Role
            }) satisfies APIApplicationCommandBasicOption
        ),
        {
          name: 'allow_non_family_accounts',
          description: command.autorole.town_hall.options.allow_non_family_accounts.description,
          description_localizations: translation('command.autorole.town_hall.options.allow_non_family_accounts.description'),
          type: ApplicationCommandOptionType.String,
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
    {
      name: 'builder-leagues',
      description: command.autorole.builder_leagues.description,
      description_localizations: translation('command.autorole.builder_leagues.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        ...BUILDER_BASE_LEAGUE_NAMES.map(
          (league) =>
            ({
              name: league,
              description: `${title(league)} league role.`,
              type: ApplicationCommandOptionType.Role
            }) satisfies APIApplicationCommandBasicOption
        )
      ]
    },
    {
      name: 'wars',
      description: command.autorole.wars.description,
      description_localizations: translation('command.autorole.wars.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'role',
          required: true,
          description: command.autorole.wars.options.role.description,
          description_localizations: translation('command.autorole.wars.options.role.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'clan',
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: command.autorole.wars.options.clan.description,
          description_localizations: translation('command.autorole.wars.options.clan.description')
        }
      ]
    },
    {
      name: 'eos-push',
      description: command.autorole.eos_push.description,
      description_localizations: translation('command.autorole.eos_push.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'role',
          required: true,
          description: command.autorole.eos_push.options.role.description,
          description_localizations: translation('command.autorole.eos_push.options.role.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'clans',
          required: true,
          autocomplete: true,
          type: ApplicationCommandOptionType.String,
          description: command.autorole.eos_push.options.clans.description,
          description_localizations: translation('command.autorole.eos_push.options.clans.description')
        }
      ]
    },
    {
      name: 'family',
      description: command.autorole.family.description,
      description_localizations: translation('command.autorole.family.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'family_leaders_role',
          description: command.autorole.family.options.family_leaders_role.description,
          description_localizations: translation('command.autorole.family.options.family_leaders_role.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'family_role',
          description: command.autorole.family.options.family_role.description,
          description_localizations: translation('command.autorole.family.options.family_role.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'exclusive_family_role',
          description: command.autorole.family.options.exclusive_family_role.description,
          description_localizations: translation('command.autorole.family.options.exclusive_family_role.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'guest_role',
          description: command.autorole.family.options.guest_role.description,
          description_localizations: translation('command.autorole.family.options.guest_role.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'verified_role',
          description: command.autorole.family.options.verified_role.description,
          description_localizations: translation('command.autorole.family.options.verified_role.description'),
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'account_linked_role',
          description: command.autorole.family.options.account_linked_role.description,
          description_localizations: translation('command.autorole.family.options.account_linked_role.description'),
          type: ApplicationCommandOptionType.Role
        }
      ]
    },
    {
      name: 'list',
      description: command.autorole.list.description,
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: 'disable',
      description: command.autorole.disable.description,
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'type',
          description: 'Type of roles to disable.',
          required: true,
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.autorole.clan_roles,
              name_localizations: translation('common.choices.autorole.clan_roles'),
              value: 'clan-roles'
            },
            {
              name: common.choices.autorole.town_hall,
              name_localizations: translation('common.choices.autorole.town_hall'),
              value: 'town-hall'
            },
            {
              name: common.choices.autorole.leagues,
              name_localizations: translation('common.choices.autorole.leagues'),
              value: 'leagues'
            },
            {
              name: common.choices.autorole.builder_hall,
              name_localizations: translation('common.choices.autorole.builder_hall'),
              value: 'builder-hall'
            },
            {
              name: common.choices.autorole.builder_leagues,
              name_localizations: translation('common.choices.autorole.builder_leagues'),
              value: 'builder-leagues'
            },
            {
              name: common.choices.autorole.wars,
              name_localizations: translation('common.choices.autorole.wars'),
              value: 'wars'
            },
            {
              name: common.choices.autorole.eos_push,
              name_localizations: translation('common.choices.autorole.eos_push'),
              value: 'eos-push'
            },
            {
              name: common.choices.autorole.family_leaders,
              name_localizations: translation('common.choices.autorole.family_leaders'),
              value: 'family-leaders'
            },
            {
              name: common.choices.autorole.family,
              name_localizations: translation('common.choices.autorole.family'),
              value: 'family'
            },
            {
              name: common.choices.autorole.exclusive_family,
              name_localizations: translation('common.choices.autorole.exclusive_family'),
              value: 'exclusive-family'
            },
            {
              name: common.choices.autorole.guest,
              name_localizations: translation('common.choices.autorole.guest'),
              value: 'guest'
            },
            {
              name: common.choices.autorole.verified,
              name_localizations: translation('common.choices.autorole.verified'),
              value: 'verified'
            },
            {
              name: common.choices.autorole.account_linked,
              name_localizations: translation('common.choices.autorole.account_linked'),
              value: 'account-linked'
            }
          ]
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
      name: 'refresh',
      description: command.autorole.refresh.description,
      description_localizations: translation('command.autorole.refresh.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user_or_role',
          description: command.autorole.refresh.options.user_or_role.description,
          description_localizations: translation('command.autorole.refresh.options.user_or_role.description'),
          type: ApplicationCommandOptionType.Mentionable
        },
        {
          name: 'is_test_run',
          description: command.autorole.refresh.options.is_test_run.description,
          description_localizations: translation('command.autorole.refresh.options.is_test_run.description'),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'force_refresh',
          description: command.autorole.refresh.options.force_refresh.description,
          description_localizations: translation('command.autorole.refresh.options.force_refresh.description'),
          type: ApplicationCommandOptionType.Boolean
        }
      ]
    },
    {
      name: 'config',
      description: command.autorole.config.description,
      description_localizations: translation('command.autorole.config.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'auto_update_roles',
          description: command.autorole.config.options.auto_update_roles.description,
          description_localizations: translation('command.autorole.config.options.auto_update_roles.description'),
          type: ApplicationCommandOptionType.String,
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
        },
        {
          name: 'role_removal_delays',
          description: command.autorole.config.options.role_removal_delays.description,
          description_localizations: translation('command.autorole.config.options.role_removal_delays.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.off,
              name_localizations: translation('common.choices.off'),
              value: '0'
            },
            {
              name: '1h',
              value: '1h'
            },
            {
              name: '2h',
              value: '2h'
            },
            {
              name: '4h',
              value: '4h'
            },
            {
              name: '6h',
              value: '6h'
            },
            {
              name: '8h',
              value: '8h'
            },
            {
              name: '12h',
              value: '12h'
            },
            {
              name: '18h',
              value: '18h'
            },
            {
              name: '24h',
              value: '24h'
            },
            {
              name: '36h',
              value: '36h'
            },
            {
              name: '48h',
              value: '48h'
            },
            {
              name: '72h',
              value: '72h'
            },
            {
              name: '7d',
              value: '7d'
            },
            {
              name: '12d',
              value: '12d'
            }
          ]
        },
        {
          name: 'role_addition_delays',
          description: command.autorole.config.options.role_addition_delays.description,
          description_localizations: translation('command.autorole.config.options.role_addition_delays.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: common.choices.off,
              name_localizations: translation('common.choices.off'),
              value: '0'
            },
            {
              name: '1h',
              value: '1h'
            },
            {
              name: '2h',
              value: '2h'
            },
            {
              name: '4h',
              value: '4h'
            },
            {
              name: '6h',
              value: '6h'
            },
            {
              name: '8h',
              value: '8h'
            },
            {
              name: '12h',
              value: '12h'
            },
            {
              name: '18h',
              value: '18h'
            },
            {
              name: '24h',
              value: '24h'
            }
          ]
        },
        {
          name: 'delay_exclusion_roles',
          description: command.autorole.config.options.delay_exclusion_roles.description,
          description_localizations: translation('command.autorole.config.options.delay_exclusion_roles.description'),
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: 'Town Hall Roles',
              value: 'town-hall-roles'
            },
            {
              name: 'Builder Hall Roles',
              value: 'builder-hall-roles'
            },
            {
              name: 'League Roles',
              value: 'league-roles'
            },
            {
              name: 'Builder League Roles',
              value: 'builder-league-roles'
            },
            {
              name: 'Guest Role',
              value: 'guest-role'
            }
          ]
        },
        {
          name: 'always_force_refresh_roles',
          description: command.autorole.config.options.always_force_refresh_roles.description,
          description_localizations: translation('command.autorole.config.options.always_force_refresh_roles.description'),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'allow_not_linked',
          description: command.autorole.config.options.allow_not_linked.description,
          description_localizations: translation('command.autorole.config.options.allow_not_linked.description'),
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'verified_only_clan_roles',
          description: command.autorole.config.options.verified_only_clan_roles.description,
          description_localizations: translation('command.autorole.config.options.verified_only_clan_roles.description'),
          type: ApplicationCommandOptionType.String,
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
    }
  ]
};
