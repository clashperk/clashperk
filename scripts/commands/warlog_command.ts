import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const WARLOG_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'warlog',
  description: command.warlog.description,
  dm_permission: false,
  description_localizations: translation('command.warlog.description'),
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
};
