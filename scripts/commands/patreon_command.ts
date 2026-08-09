import { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { guildInstallable } from './@helper.js';

export const PATREON_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'patreon',
  description: "Shows information about the bot's Patreon.",
  dm_permission: true,
  ...guildInstallable
};
