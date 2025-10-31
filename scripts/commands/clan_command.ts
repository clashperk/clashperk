import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command, common } from '../../src/util/locales.js';
import { translation, userInstallable } from './@helper.js';

export const CLAN_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'clan',
  description: command.clan.description,
  dm_permission: false,
  description_localizations: translation('command.clan.description'),
  options: [
    {
      name: 'tag',
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
      name: 'by_player_tag',
      description: command.clan.options.by_player_tag.description,
      description_localizations: translation('command.clan.options.by_player_tag.description'),
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: false
    }
  ],
  ...userInstallable
};
