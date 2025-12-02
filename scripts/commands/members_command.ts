import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { MembersCommandOptions } from '../../src/util/command.options.js';
import { command, common } from '../../src/util/locales.js';
import { translation } from './@helper.js';

export const MEMBERS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'members',
  description: command.members.description,
  dm_permission: false,
  description_localizations: translation('command.members.description'),
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
      name: 'option',
      description: common.select_an_option,
      description_localizations: translation('common.select_an_option'),
      type: ApplicationCommandOptionType.String,
      choices: [
        ...Object.values(MembersCommandOptions).map((choice) => ({
          name: choice.label,
          value: choice.id
        }))
      ]
    }
  ]
};
