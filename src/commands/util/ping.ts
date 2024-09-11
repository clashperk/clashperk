import { Message } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class PingCommand extends Command {
  public constructor() {
    super('ping', {
      category: 'none',
      defer: false
    });
  }

  public async run(message: Message<true>) {
    const msg = await message.channel.send({
      content: '**Pinging...**',
      allowedMentions: { repliedUser: false },
      reply: { messageReference: message.id, failIfNotExists: false }
    });

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const ping = (msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp);
    return msg.edit({
      allowedMentions: { repliedUser: false },
      content: [`**Gateway Ping~ ${Math.round(this.client.ws.ping).toString()}ms**`, `**API Ping~ ${ping.toString()}ms**`].join('\n')
    });
  }
}
