import { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { guildInstallable } from './@helper.js';

export const STATUS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'status',
  description: "Shows information about the bot's status.",
  dm_permission: true,
  ...guildInstallable
};
