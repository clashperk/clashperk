const { Listener } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class RateLimitListener extends Listener {
	constructor() {
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
			if (!webhook) return this.embeds = [];

			const embeds = [...this.embeds];
			this.embeds = [];
			return webhook.send({
				username: 'ClashPerk',
				avatarURL: this.client?.user?.displayAvatarURL(),
				embeds: [...embeds]
			});
		}, 5000);
	}

	async fetchWebhook() {
		if (this.webhook) return this.webhook;
		this.webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'rateLimitWebhook', undefined)).catch(() => null);
		return this.webhook;
	}

	async exec({ timeout, limit, method, path, route }) {
		this.count += 1;
		if (this.count >= 5) return this.client.cacheHandler.pause(true);
		this.client.logger.warn({ timeout, limit, method, path, route }, { label: 'RATELIMIT' });

		const embed = new MessageEmbed()
			.setAuthor('Rate Limit')
			.setDescription([
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
			])
			.setFooter(`Shard ${this.client.shard.ids[0]}`)
			.setTimestamp();

		return this.embeds.push(embed);
	}
}

module.exports = RateLimitListener;
