import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const REDEEM_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'redeem',
  description: command.redeem.description,
  description_localizations: translation('command.redeem.description'),
  dm_permission: false,
  options: [
    {
      name: 'disable',
      description: command.redeem.options.disable.description,
      description_localizations: translation('command.redeem.options.disable.description'),
      type: ApplicationCommandOptionType.String,
      choices: [
        {
          name: common.choices.yes,
          name_localizations: translation('common.choices.yes'),
          value: 'true'
        },
        {
          name: common.choices.no,
          name_localizations: translation('common.choices.no'),
          value: 'false'
        }
      ]
    }
  ]
};
