import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const VERIFY_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'verify',
  description: command.verify.description,
  dm_permission: false,
  description_localizations: translation('command.verify.description'),
  options: [
    {
      name: 'player',
      required: true,
      autocomplete: true,
      description: command.verify.options.tag.description,
      description_localizations: translation('command.verify.options.tag.description'),
      type: ApplicationCommandOptionType.String
    },
    {
      name: 'token',
      required: true,
      description: command.verify.options.token.description,
      description_localizations: translation('command.verify.options.token.description'),
      type: ApplicationCommandOptionType.String
    }
  ]
};
