import { Listener } from '../../lib/handlers.js';

export default class GatewayRateLimitListener extends Listener {
  public constructor() {
    super('gatewayRateLimit', {
      event: 'RATE_LIMITED',
      emitter: 'ws',
      category: 'client'
    });
  }

  public exec(a: unknown, b: unknown) {
    console.log({ a, b });
  }
}
