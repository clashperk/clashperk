const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');

class GuildCreateListener extends Listener {
	constructor() {
		super('guildCreate', {
			emitter: 'client',
			event: 'guildCreate',
			category: 'client'
		});
	}

	async exec(guild) {
		Logger.log(`${guild.name} (${guild.id})`, { level: 'GUILD_CREATE' });

		const user = await this.client.users.fetch(guild.ownerID).catch(() => null);
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'webhook', undefined)).catch(() => null);
		if (webhook) {
			const embed = this.client.util.embed()
				.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL())
				.setTitle(`${this.client.emojis.get('609254782808621066')} ${user.tag} (${user.id})`)
				.setFooter(`${guild.memberCount} members`, user.displayAvatarURL())
				.setColor(0x38d863)
				.setTimestamp();

			return webhook.send({ embeds: [embed] });
		}
	}
}

module.exports = GuildCreateListener;
