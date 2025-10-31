import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation, userInstallable } from './@helper.js';

export const UPGRADES_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'upgrades',
  description: command.upgrades.description,
  dm_permission: false,
  description_localizations: translation('command.upgrades.description'),
  options: [
    {
      name: 'player',
      description: common.options.player.tag.description,
      description_localizations: translation('common.options.player.tag.description'),
      type: ApplicationCommandOptionType.String,
      required: false,
      autocomplete: true
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
