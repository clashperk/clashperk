const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');
const { firestore } = require('../../struct/Database');

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

		await this.restore(guild);

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

	async restore(guild) {
		const restored = await firestore.collection('tracking_clans')
			.where('guild', '==', guild.id)
			.get()
			.then(snapstot => {
				snapstot.forEach(doc => {
					const { tag, guild, channel, color } = doc.data();
					this.client.tracker.add(tag, guild, channel, color);
				});
				return snapstot.size;
			});
		return restored;
	}
}

module.exports = GuildCreateListener;
