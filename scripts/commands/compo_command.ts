import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const COMPO_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'compo',
  description: command.compo.description,
  dm_permission: false,
  description_localizations: translation('command.compo.description'),
  options: [
    {
      name: 'clan',
      description: common.options.clan.tag.description,
      description_localizations: translation('common.options.clan.tag.description'),
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: false
    },
    {
      name: 'user',
      description: common.options.clan.user.description,
      description_localizations: translation('common.options.clan.user.description'),
      type: ApplicationCommandOptionType.User,
      required: false
    }
  ]
};
