import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

export const EVAL_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'eval',
  description: "You can't use it anyway, so why explain?",
  dm_permission: true,
  default_member_permissions: '0',
  options: [
    {
      name: 'code',
      description: 'Code to evaluate.',
      type: ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: 'shard',
      description: 'Whether to run the code on all shards or just the current one.',
      type: ApplicationCommandOptionType.Boolean,
      required: false
    },
    {
      name: 'depth',
      description: 'Depth of the returned object.',
      type: ApplicationCommandOptionType.Number,
      required: false
    }
  ]
};
