import { MessageEmbed, Webhook } from 'discord.js';
import { Listener } from '../../lib';

export default class RateLimitListener extends Listener {
	public count: number;

	public embeds: MessageEmbed[];

	public webhook: Webhook | null = null;

	public constructor() {
		super('rateLimit', {
			event: 'rateLimit',
			emitter: 'client',
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

	private async fetchWebhook() {
		if (this.webhook) return this.webhook;
		this.webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'rateLimitWebhook', undefined)).catch(() => null);
		return this.webhook;
	}

	public exec({ timeout, limit, method, path, route }: { timeout: number; limit: number; method: string; path: string; route: string }) {
		this.count += 1;
		if (this.count >= 5) return this.client.rpcHandler.pause(true);
		this.client.logger.warn({ timeout, limit, method, path, route }, { label: 'RATE_LIMIT' });

		const embed = new MessageEmbed()
			.setAuthor({ name: 'Rate Limit' })
			.setDescription(
				[
					'**Time Out**',
					timeout,
					'',
					'**Limit**',
					limit,
					'',
					'**HTTP Method**',
					method.toUpperCase(),
					'',
					'**Route**',
					route,
					'',
					'**Path**',
					decodeURIComponent(path)
				].join('\n')
			)
			.setFooter({ text: `Shard ${this.client.shard!.ids[0]}` })
			.setTimestamp();

		return this.embeds.push(embed);
	}
}
