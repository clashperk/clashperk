import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import {
  getLeagueSeasonChoices,
  getStatsPeriodChoices,
  guildInstallable,
  translation
} from './@helper.js';

export const LEADERBOARD_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'leaderboard',
  description: command.leaderboard.description,
  description_localizations: translation('command.leaderboard.description'),
  dm_permission: false,
  options: [
    {
      name: 'clans',
      description: command.leaderboard.clans.description,
      description_localizations: translation('command.leaderboard.clans.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'location',
          description: command.leaderboard.options.location.description,
          description_localizations: translation(
            'command.leaderboard.options.location.description'
          ),
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        },
        {
          name: 'season',
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          type: ApplicationCommandOptionType.String,
          choices: getLeagueSeasonChoices()
        }
      ]
    },
    {
      name: 'players',
      description: command.leaderboard.players.description,
      description_localizations: translation('command.leaderboard.players.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'location',
          description: command.leaderboard.options.location.description,
          description_localizations: translation(
            'command.leaderboard.options.location.description'
          ),
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        },
        {
          name: 'season',
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          type: ApplicationCommandOptionType.String,
          choices: getLeagueSeasonChoices()
        }
      ]
    },
    {
      name: 'capital',
      description: command.leaderboard.capital.description,
      description_localizations: translation('command.leaderboard.capital.description'),
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'location',
          description: command.leaderboard.options.location.description,
          description_localizations: translation(
            'command.leaderboard.options.location.description'
          ),
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        },
        {
          name: 'season',
          description: common.options.season.description,
          description_localizations: translation('common.options.season.description'),
          type: ApplicationCommandOptionType.String,
          choices: getStatsPeriodChoices()
        }
      ]
    }
  ],
  ...guildInstallable
};
