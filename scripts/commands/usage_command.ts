import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

export const USAGE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'usage',
  description: "You can't use it anyway, so why explain?",
  dm_permission: true,
  default_member_permissions: '0',
  options: [
    {
      name: 'chart',
      description: 'It does something, yeah?',
      type: ApplicationCommandOptionType.Boolean,
      required: false
    },
    {
      name: 'limit',
      description: 'It does something, yeah?',
      type: ApplicationCommandOptionType.Integer,
      required: false
    }
  ]
};
