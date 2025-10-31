import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const ARMY_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'army',
  description: command.army.description,
  dm_permission: false,
  description_localizations: translation('command.army.description'),
  options: [
    {
      name: 'link',
      description: command.army.options.link.description,
      description_localizations: translation('command.army.options.link.description'),
      type: ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: 'army_name',
      description: command.army.options.name.description,
      description_localizations: translation('command.army.options.name.description'),
      type: ApplicationCommandOptionType.String,
      required: false
    },
    {
      name: 'tips',
      description: command.army.options.tips.description,
      description_localizations: translation('command.army.options.tips.description'),
      type: ApplicationCommandOptionType.String,
      max_length: 600,
      required: false
    }
  ]
};
