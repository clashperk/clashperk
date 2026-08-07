import { Listener } from '../../lib/handlers.js';

export default class OnRescheduleRemindersListener extends Listener {
  public constructor() {
    super('auto-reschedule-reminders', {
      event: 'clientReady',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec() {
    if (new Date().getTime() >= new Date('2026-08-06').getTime()) return;
    for (const guild of this.client.guilds.cache.values()) {
      const key = `REM:${guild.id}`;
      if (await this.client.redis.get(key)) continue;

      await this.client.clanWarScheduler.restoreSchedulers(guild.id);
      await this.client.redis.set(key, '1', 60 * 60 * 24 * 3);
    }
  }
}
