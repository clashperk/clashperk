import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { guildInstallable } from './@helper.js';

export const ASK_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'ask',
  type: ApplicationCommandType.Message,
  dm_permission: true,
  ...guildInstallable
};
