import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation, userInstallable } from './@helper.js';

export const RUSHED_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'rushed',
  description: command.rushed.description,
  dm_permission: false,
  description_localizations: translation('command.rushed.description'),
  options: [
    {
      name: 'player',
      description: common.options.player.tag.description,
      description_localizations: translation('common.options.player.tag.description'),
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: false
    },
    {
      name: 'user',
      description: common.options.player.user.description,
      description_localizations: translation('common.options.player.user.description'),
      type: ApplicationCommandOptionType.User,
      required: false
    },
    {
      name: 'clan',
      description: command.rushed.options.clan.description,
      description_localizations: translation('command.rushed.options.clan.description'),
      type: ApplicationCommandOptionType.String,
      autocomplete: true
    }
  ],
  ...userInstallable
};
