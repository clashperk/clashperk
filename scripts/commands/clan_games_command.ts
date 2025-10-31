import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { getSeasonIds, translation } from './@helper.js';

export const CLAN_GAMES_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'clan-games',
  description: command.clan_games.description,
  dm_permission: false,
  description_localizations: translation('command.clan_games.description'),
  options: [
    {
      name: 'clan',
      description: common.options.clan.tag.description,
      description_localizations: translation('common.options.clan.tag.description'),
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: false
    },
    {
      name: 'user',
      description: common.options.clan.user.description,
      description_localizations: translation('common.options.clan.user.description'),
      type: ApplicationCommandOptionType.User,
      required: false
    },
    {
      name: 'season',
      description: command.clan_games.options.season.description,
      description_localizations: translation('command.clan_games.options.season.description'),
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: getSeasonIds()
    }
  ]
};
