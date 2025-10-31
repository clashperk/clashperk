import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation, userInstallable } from './@helper.js';

export const PROFILE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'profile',
  description: command.profile.description,
  dm_permission: false,
  description_localizations: translation('command.profile.description'),
  options: [
    {
      name: 'user',
      description: command.profile.options.user.description,
      description_localizations: translation('command.profile.options.user.description'),
      type: ApplicationCommandOptionType.User,
      required: false
    },
    {
      name: 'player',
      description: common.options.player.tag.description,
      description_localizations: translation('common.options.player.tag.description'),
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ],
  ...userInstallable
};
