import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { getSeasonIds, translation } from './@helper.js';

export const DONATIONS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'donations',
  description: command.donations.description,
  dm_permission: false,
  description_localizations: translation('command.donations.description'),
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
      description: command.donations.options.user.description,
      description_localizations: translation('command.donations.options.user.description'),
      type: ApplicationCommandOptionType.User,
      required: false
    },
    {
      name: 'season',
      description: command.donations.options.season.description,
      description_localizations: translation('command.donations.options.season.description'),
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: getSeasonIds()
    },
    {
      name: 'start_date',
      description: common.options.start_date.description,
      description_localizations: translation('common.options.start_date.description'),
      type: ApplicationCommandOptionType.String,
      required: false
    },
    {
      name: 'end_date',
      description: common.options.end_date.description,
      description_localizations: translation('common.options.end_date.description'),
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ]
};
