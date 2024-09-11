import { Listener } from '../../lib/index.js';

export default class ShardDisconnectListener extends Listener {
  public constructor() {
    super('shardDisconnect', {
      event: 'shardDisconnect',
      emitter: 'client',
      category: 'client'
    });
  }

  public exec(event: any, id: number) {
    this.client.logger.warn(`Shard ${id} disconnected (${event.code as number})`, { label: 'SHARD DISCONNECTED' });
  }
}
