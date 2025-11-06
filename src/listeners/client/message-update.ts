import { ActionRow, Message, MessageActionRowComponent } from 'discord.js';
import { diff } from 'radash';
import { Listener } from '../../lib/handlers.js';

export default class MessageUpdateListener extends Listener {
  public constructor() {
    super('messageUpdate', {
      event: 'messageUpdate',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec(oldMessage: Message, newMessage: Message) {
    if (!(oldMessage.author?.id === this.client.user.id && newMessage.author.id === this.client.user.id)) return;

    const oldMessageComponentIds = this.flattenCustomIds(oldMessage);
    const newMessageComponentIds = this.flattenCustomIds(newMessage);

    const disposedCustomIds = diff(oldMessageComponentIds, newMessageComponentIds);
    if (!disposedCustomIds.length) return;

    for (const customId of disposedCustomIds) {
      await this.client.redis.expireCustomId(customId);
    }
  }

  public flattenCustomIds(message: Message): string[] {
    return (message.components as ActionRow<MessageActionRowComponent>[])
      .flatMap((actionRow) => actionRow.components)
      .map((messageComponent) => messageComponent.customId as string)
      .filter((customId) => customId && /^CMD/.test(customId));
  }
}
