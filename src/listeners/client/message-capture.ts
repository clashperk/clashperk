import { Message } from 'discord.js';
import { Listener } from '../../lib/handlers.js';
import { mixpanel } from '../../struct/mixpanel.js';

export default class MessageCaptureListener extends Listener {
  public constructor() {
    super('messageCapture', {
      event: 'messageCreate',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec(message: Message) {
    if (message.applicationId && message.applicationId !== this.client.user?.id) return;

    mixpanel.track('Message sent', {
      distinct_id: this.client.user!.id,
      guild_id: message.guild ? message.guild.id : 'DM',
      guild_name: message.guild ? message.guild.name : 'DM',
      display_name: message.author.displayName
    });

    mixpanel.people.set(this.client.user!.id, {
      $first_name: message.author.displayName,
      username: message.author.username,
      user_id: message.author.id,
      locale: 'en-US'
    });
  }
}
