import { Listener } from '../../lib/handlers.js';

export default class DebugListener extends Listener {
  public constructor() {
    super('debug', {
      event: 'debug',
      emitter: 'client',
      category: 'client'
    });
  }

  public exec(info: string) {
    if (process.env.DEBUG) this.client.logger.debug(`${info}`, { label: 'DEBUG' });
  }
}
