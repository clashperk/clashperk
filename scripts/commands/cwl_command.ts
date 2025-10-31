import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { getSeasonIds, translation } from './@helper.js';

export const CWL_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'cwl',
  description: command.cwl.description,
  dm_permission: false,
  description_localizations: translation('command.cwl.description'),
  options: [
    {
      name: 'roster',
      description: command.cwl.roster.description,
      description_localizations: translation('command.cwl.roster.description'),
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
        }
      ]
    },
    {
      name: 'round',
      description: command.cwl.round.description,
      description_localizations: translation('command.cwl.round.description'),
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
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: command.cwl.round.options.season.description,
          description_localizations: translation('command.cwl.round.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'user',
          description: common.options.clan.user.description,
          description_localizations: translation('common.options.clan.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        }
      ]
    },
    {
      name: 'lineup',
      description: command.cwl.lineup.description,
      description_localizations: translation('command.cwl.lineup.description'),
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
        }
      ]
    },
    {
      name: 'stars',
      description: command.cwl.stars.description,
      description_localizations: translation('command.cwl.stars.description'),
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
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: command.cwl.round.options.season.description,
          description_localizations: translation('command.cwl.round.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'user',
          description: common.options.clan.user.description,
          description_localizations: translation('common.options.clan.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        }
      ]
    },
    {
      name: 'attacks',
      description: command.cwl.attacks.description,
      description_localizations: translation('command.cwl.attacks.description'),
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
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: command.cwl.round.options.season.description,
          description_localizations: translation('command.cwl.round.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'user',
          description: common.options.clan.user.description,
          description_localizations: translation('common.options.clan.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        }
      ]
    },
    {
      name: 'stats',
      description: command.cwl.stats.description,
      description_localizations: translation('command.cwl.stats.description'),
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
          name: 'season',
          required: false,
          type: ApplicationCommandOptionType.String,
          description: command.cwl.round.options.season.description,
          description_localizations: translation('command.cwl.round.options.season.description'),
          choices: getSeasonIds()
        },
        {
          name: 'user',
          description: common.options.clan.user.description,
          description_localizations: translation('common.options.clan.user.description'),
          type: ApplicationCommandOptionType.User,
          required: false
        }
      ]
    },
    {
      name: 'members',
      description: command.cwl.members.description,
      description_localizations: translation('command.cwl.members.description'),
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
        }
      ]
    }
  ]
};
