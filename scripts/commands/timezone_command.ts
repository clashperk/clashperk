import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const TIMEZONE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'timezone',
  description: command.timezone.description,
  description_localizations: translation('command.timezone.description'),
  dm_permission: false,
  options: [
    {
      name: 'location',
      description: command.timezone.options.location.description,
      description_localizations: translation('command.timezone.options.location.description'),
      type: ApplicationCommandOptionType.String,
      // autocomplete: true,
      required: true
    }
  ]
};
