import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const WAR_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'war',
  description: command.war.description,
  dm_permission: false,
  description_localizations: translation('command.war.description'),
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
    },
    {
      name: 'war_id',
      description: command.war.options.war_id.description,
      description_localizations: translation('command.war.options.war_id.description'),
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ]
};
