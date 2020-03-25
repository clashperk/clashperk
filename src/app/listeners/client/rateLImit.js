const { Listener } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class RateLimitListener extends Listener {
	constructor() {
		super('rateLimit', {
			event: 'rateLimit',
			emitter: 'client',
			category: 'client'
		});
	}

	async fetchWebhook() {
		if (this.webhook) return this.webhook;
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'rateLimitWebhook', undefined)).catch(() => null);
		this.webhook = webhook;
		return webhook;
	}

	async exec({ timeout, limit, method, path, route }) {
		const msg = { timeout, limit, method, path, route };
		this.client.logger.warn(msg, { label: 'RATELIMIT' });

		const webhook = await this.fetchWebhook().catch(() => null);
		if (!webhook) return;

		const embed = new MessageEmbed()
			.setColor(0xfaf5f5)
			.setAuthor('Rate Limit')
			.setTimestamp()
			.addField('Time Out', timeout, true)
			.addField('Limit', limit, true)
			.addField('HTTP Method', method, true)
			.addField('Route', route)
			.addField('Path', path);

		return webhook.send({
			username: 'Rate Limit',
			avatarURL: this.client.user.displayAvatarURL(),
			embeds: [embed]
		});
	}
}

module.exports = RateLimitListener;
