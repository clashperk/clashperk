import { Message } from 'discord.js';
import { Listener } from '../../lib/handlers.js';
import moment from 'moment';

export default class MessageCaptureListener extends Listener {
  public constructor() {
    super('messageCapture', {
      event: 'messageCreate',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec(message: Message) {
    if (!message.applicationId) return;
    if (message.applicationId !== this.client.user?.id) return;

    const key = `MSG_SENT:${moment().format('YYYY-MM-DD')}`;
    await this.client.redis.connection
      .multi()
      .incr(key)
      .expire(key, 60 * 60 * 24 * 30) // 30 days
      .exec();
  }
}
