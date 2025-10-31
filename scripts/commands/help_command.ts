import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation, userInstallable } from './@helper.js';

export const HELP_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'help',
  description: command.help.description,
  dm_permission: false,
  description_localizations: translation('command.help.description'),
  options: [
    {
      name: 'command',
      description: command.help.options.name.description,
      description_localizations: translation('command.help.options.name.description'),
      type: ApplicationCommandOptionType.String
    }
  ],
  ...userInstallable
};
