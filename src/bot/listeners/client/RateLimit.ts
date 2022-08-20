import { EmbedBuilder, Webhook } from 'discord.js';
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

	public exec({ timeout, limit, method, path, route }: { timeout: number; limit: number; method: string; path: string; route: string }) {
		this.count += 1;
		if (this.count >= 5) return this.client.rpcHandler.pause(true);
		this.client.logger.warn({ timeout, limit, method, path, route }, { label: 'RATE_LIMIT' });
		if (path.includes(this.getWebhookId())) return;

		const embed = new EmbedBuilder()
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
			.setFooter({ text: `Shard ${this.client.shard!.ids[0]!}` })
			.setTimestamp();

		return this.embeds.push(embed);
	}
}
