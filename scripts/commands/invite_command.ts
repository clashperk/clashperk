import { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { command } from '../../src/util/locales.js';
import { translation, userInstallable } from './@helper.js';

export const INVITE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'invite',
  description: command.invite.description,
  dm_permission: true,
  description_localizations: translation('command.invite.description'),
  ...userInstallable
};
