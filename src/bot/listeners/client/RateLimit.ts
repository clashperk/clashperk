import { EmbedBuilder, RateLimitData, Webhook } from 'discord.js';
import { Listener } from '../../lib/index.js';

export default class RateLimitListener extends Listener {
	public count: number;

	public embeds: EmbedBuilder[];

	public webhook: Webhook | null = null;

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
			const webhook = await this.fetchWebhook().catch(() => null);
			if (!webhook) return (this.embeds = []);

			const embeds = [...this.embeds];
			this.embeds = [];
			return webhook.send({
				username: this.client.user!.username,
				avatarURL: this.client.user?.displayAvatarURL(),
				embeds: [...embeds]
			});
		}, 5000);
	}

	private getWebhookId() {
		return this.client.settings.get<string>('global', 'rateLimitWebhook', null);
	}

	private async fetchWebhook() {
		if (this.webhook) return this.webhook;
		this.webhook = await this.client.fetchWebhook(this.getWebhookId()).catch(() => null);
		return this.webhook;
	}

	public exec({ limit, method, route, global, hash, majorParameter, timeToReset, url }: RateLimitData) {
		this.count += 1;
		if (this.count >= 5) return this.client.rpcHandler.pause(true);
		this.client.logger.warn({ timeToReset, limit, method, url, route, global, hash, majorParameter }, { label: 'RATE_LIMIT' });
		if (url.includes(this.getWebhookId())) return;

		const embed = new EmbedBuilder()
			.setAuthor({ name: 'Rate Limit' })
			.setDescription(
				[
					`**Timeout:** ${timeToReset}`,
					`**Global:** ${global.toString()}`,
					`**Limit:** ${limit}`,
					`**Method:** ${method.toUpperCase()}`,
					`**Route:** ${route}`,
					`**URL:** ${decodeURIComponent(new URL(url).pathname)}`
				].join('\n')
			)
			.setFooter({ text: `Shard ${this.client.shard!.ids[0]!}` })
			.setTimestamp();

		return this.embeds.push(embed);
	}
}
