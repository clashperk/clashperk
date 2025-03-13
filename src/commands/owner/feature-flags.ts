import { FeatureFlags } from '@app/constants';
import { Message } from 'discord.js';
import { inspect } from 'util';
import { Command } from '../../lib/handlers.js';

export default class FeatureFlagsCommand extends Command {
  public constructor() {
    super('feature-flags', {
      category: 'none',
      defer: false,
      ownerOnly: true
    });
  }

  public async run(message: Message<true>) {
    const result = await Promise.all(
      Object.values(FeatureFlags).map(async (flag) => ({
        [flag]: this.client.isFeatureEnabled(flag, message.guild.id)
      }))
    );

    const inspected = inspect(result, { depth: 1 }).replace(new RegExp('!!NL!!', 'g'), '\n');
    return message.channel.send(`\`\`\`${inspected}\`\`\``);
  }
}
