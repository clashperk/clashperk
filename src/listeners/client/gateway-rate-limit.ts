import { GatewayOpcodes } from 'discord.js';
import { Listener } from '../../lib/handlers.js';

export default class GatewayRateLimitListener extends Listener {
  public constructor() {
    super('gatewayRateLimit', {
      event: 'RATE_LIMITED',
      emitter: 'ws',
      category: 'client'
    });
  }

  public exec(
    payload: {
      retry_after: number;
      opcode: GatewayOpcodes;
      meta?: { nonce: string; guild_id: string };
    },
    opcode: GatewayOpcodes
  ) {
    if ((opcode || payload.opcode) !== GatewayOpcodes.RequestGuildMembers) return;
    if (!payload.meta?.guild_id) return;

    const guildId = payload.meta.guild_id;
    const retryAfter = payload.retry_after * 1000;

    this.client.logger.warn(`Gateway rate limited for ${guildId}. Retry after ${retryAfter}ms.`, {
      label: 'GatewayRateLimitListener'
    });

    this.client.cacheOverLimitGuilds.add(guildId);

    setTimeout(() => {
      this.client.cacheOverLimitGuilds.delete(guildId);
    }, retryAfter);
  }
}
