import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { userInstallable } from './@helper.js';

export const TRANSLATE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'translate',
  type: ApplicationCommandType.Message,
  dm_permission: false,
  ...userInstallable
};
