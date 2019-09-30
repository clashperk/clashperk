const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');
const { firestore } = require('../../struct/Database');

class GuildDeleteListener extends Listener {
	constructor() {
		super('guildDelete', {
			emitter: 'client',
			event: 'guildDelete',
			category: 'client'
		});
	}

	async exec(guild) {
		Logger.log(`${guild.name} (${guild.id})`, { level: 'GUILD_DELETE' });

		await this.delete(guild);

		const user = await this.client.users.fetch(guild.ownerID).catch(() => null);
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'webhook', undefined)).catch(() => null);
		if (webhook) {
			const embed = this.client.util.embed()
				.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL())
				.setTitle(`${this.client.emojis.get('609254782808621066')} ${user.tag} (${user.id})`)
				.setFooter(`${guild.memberCount} members`, user.displayAvatarURL())
				.setColor(0xeb3508)
				.setTimestamp();

			return webhook.send({ embeds: [embed] });
		}
	}

	async delete(guild) {
		// const batch = firestore.batch();
		const deleted = await firestore.collection('tracking_clans')
			.where('guild', '==', guild.id)
			.get()
			.then(snapstot => {
				snapstot.forEach(doc => {
					this.client.tracker.delete(guild.id, doc.data().tag);
					// batch.delete(doc.ref);
				});
				// return batch.commit() && snapstot.size;
			});
		return deleted;
	}
}

module.exports = GuildDeleteListener;
