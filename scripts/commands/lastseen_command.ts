import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const LASTSEEN_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'lastseen',
  description: command.lastseen.description,
  dm_permission: false,
  description_localizations: translation('command.lastseen.description'),
  options: [
    {
      name: 'clan',
      description: common.options.clan.tag.description,
      description_localizations: translation('common.options.clan.tag.description'),
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
    }
  ]
};
