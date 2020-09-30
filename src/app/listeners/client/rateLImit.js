const { Listener } = require('discord-akairo');
const { MessageEmbed, WebhookClient } = require('discord.js');

class RateLimitListener extends Listener {
	constructor() {
		super('rateLimit', {
			event: 'rateLimit',
			emitter: 'client',
			category: 'client'
		});

		this.count = 0;
		setInterval(() => this.count = 0, 5000);
	}

	async fetchWebhook() {
		if (this.webhook) return this.webhook;
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'rateLimitWebhook', undefined)).catch(() => null);
		this.webhook = webhook;
		return webhook;
	}

	async exec({ timeout, limit, method, path, route }) {
		this.count += 1;
		if (this.count >= 5) return process.exit(1);

		this.client.logger.warn({ timeout, limit, method, path, route }, { label: 'RATELIMIT' });
		const webhook = await this.fetchWebhook().then(webhook => new WebhookClient(webhook.id, webhook.token)).catch(() => null);
		if (!webhook) return;

		const embed = new MessageEmbed()
			.setColor(0xfaf5f5)
			.setAuthor('Rate Limit')
			.setDescription([
				'**Time Out**',
				timeout,
				'',
				'**Limit**',
				limit,
				'',
				'**HTTP Method**',
				method,
				'',
				'**Route**',
				route,
				'',
				'**Path**',
				decodeURIComponent(path)
			])
			.setTimestamp();

		return webhook.send({
			username: 'ClashPerk',
			avatarURL: this.client.user.displayAvatarURL(),
			embeds: [embed]
		});
	}
}

module.exports = RateLimitListener;
