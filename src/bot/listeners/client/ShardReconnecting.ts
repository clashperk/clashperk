import { Listener } from '../../lib/index.js';

export default class ShardReconnectListener extends Listener {
  public constructor() {
    super('shardReconnecting', {
      event: 'shardReconnecting',
      emitter: 'client',
      category: 'client'
    });
  }

  public exec(id: number) {
    this.client.logger.info(`Shard ${id} Reconnecting`, { label: 'SHARD RECONNECTING' });
  }
}
