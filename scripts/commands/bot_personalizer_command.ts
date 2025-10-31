import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const BOT_PERSONALIZER_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'bot-personalizer',
  dm_permission: false,
  description: command.bot_personalizer.description,
  description_localizations: translation('command.bot_personalizer.description'),
  options: [
    {
      name: 'opt_out',
      description: command.bot_personalizer.options.opt_out.description,
      description_localizations: translation('command.bot_personalizer.options.opt_out.description'),
      type: ApplicationCommandOptionType.Boolean
    }
  ]
};
