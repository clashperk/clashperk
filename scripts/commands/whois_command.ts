import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { guildInstallable } from './@helper.js';

export const WHOIS_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'whois',
  type: ApplicationCommandType.User,
  dm_permission: false,
  ...guildInstallable
};
