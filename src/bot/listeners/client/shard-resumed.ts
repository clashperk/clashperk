import { Listener } from '../../lib/index.js';

export default class ShardResumeListener extends Listener {
  public constructor() {
    super('shardResume', {
      event: 'shardResume',
      emitter: 'client',
      category: 'client'
    });
  }

  public exec(id: number, replayedEvents: number) {
    this.client.logger.info(`Shard ${id} resumed (replayed ${replayedEvents} events)`, { label: 'SHARD RESUMED' });
  }
}
