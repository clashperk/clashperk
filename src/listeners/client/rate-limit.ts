import { Settings } from '@app/constants';
import { EmbedBuilder, RateLimitData, WebhookClient } from 'discord.js';
import { Listener } from '../../lib/handlers.js';

export default class RateLimitListener extends Listener {
  public count: number;
  public embeds: EmbedBuilder[];
  public webhook: WebhookClient | null = null;

  public constructor() {
    super('rateLimit', {
      event: 'rateLimited',
      emitter: 'rest',
      category: 'client'
    });

    this.count = 0;
    this.embeds = [];

    setInterval(async () => {
      this.count = 0;
      if (!this.embeds.length) return;
      const webhook = this.getWebhook();
      if (!webhook) return (this.embeds = []);

      const embeds = [...this.embeds];
      this.embeds = [];
      return webhook.send({
        embeds: [...embeds],
        username: this.client.user?.displayName,
        avatarURL: this.client.user?.displayAvatarURL()
      });
    }, 5000);
  }

  private getWebhook() {
    if (this.webhook) return this.webhook;

    const url = this.client.settings.get<string>('global', Settings.RATE_LIMIT_WEBHOOK_URL, null);
    if (!url) return null;

    this.webhook = new WebhookClient({ url });
    return this.webhook;
  }

  public exec({ limit, method, route, global, hash, majorParameter, timeToReset, url }: RateLimitData) {
    this.count += 1;
    if (this.count >= 5) return this.client.enqueuer.pause(true);
    this.client.logger.warn({ timeToReset, limit, method, url, route, global, hash, majorParameter }, { label: 'RATE_LIMIT' });

    const webhook = this.getWebhook();
    if (webhook && url.includes(webhook.id)) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Rate Limit' })
      .setDescription(
        [
          `**Timeout:** ${timeToReset}`,
          `**Global:** ${global.toString()}`,
          `**Limit:** ${limit}`,
          `**Method:** ${method.toUpperCase()}`,
          `**Route:** ${route.replace(/[\w-]{20,}/g, ':token')}`,
          `**URL:** ${decodeURIComponent(new URL(url).pathname).replace(/[\w-]{20,}/g, '-')}`
        ].join('\n')
      )
      .setFooter({ text: `Cluster ${this.client.cluster.id}` })
      .setTimestamp();

    return this.embeds.push(embed);
  }
}
