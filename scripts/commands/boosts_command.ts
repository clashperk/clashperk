import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const BOOSTS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'boosts',
  description: command.boosts.description,
  dm_permission: false,
  description_localizations: translation('command.boosts.description'),
  options: [
    {
      name: 'clan',
      description: common.options.clan.tag.description,
      description_localizations: translation('common.options.clan.tag.description'),
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: false
    }
  ]
};
