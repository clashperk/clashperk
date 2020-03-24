const { Listener } = require('discord-akairo');
const { WebhookClient, MessageEmbed } = require('discord.js');

class RateLimitListener extends Listener {
	constructor() {
		super('rateLimit', {
			event: 'rateLimit',
			emitter: 'client',
			category: 'client'
		});
	}

	exec({ timeout, limit, method, path, route }) {
		const msg = { timeout, limit, method, path, route };
		this.client.logger.warn(msg, { label: 'RATELIMIT' });

		const webhook = new WebhookClient('691896200005419060', '7rRsKul-JCc8433pn6Dl6QSlwvGjjo8XtUkc4SJeYuGEqJgneQ1hwuY0zYpSU4nutIN-');
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
