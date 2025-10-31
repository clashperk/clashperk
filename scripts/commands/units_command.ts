import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation, userInstallable } from './@helper.js';

export const UNITS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'units',
  description: command.units.description,
  dm_permission: false,
  description_localizations: translation('command.units.description'),
  options: [
    {
      name: 'player',
      description: common.options.player.tag.description,
      description_localizations: translation('common.options.player.tag.description'),
      required: false,
      autocomplete: true,
      type: ApplicationCommandOptionType.String
    },
    {
      name: 'user',
      description: common.options.player.user.description,
      description_localizations: translation('common.options.player.user.description'),
      type: ApplicationCommandOptionType.User,
      required: false
    }
  ],
  ...userInstallable
};
