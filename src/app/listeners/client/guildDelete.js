const { Listener } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { emoji } = require('../../util/emojis');

class GuildDeleteListener extends Listener {
	constructor() {
		super('guildDelete', {
			emitter: 'client',
			event: 'guildDelete',
			category: 'client'
		});
	}

	async fetchWebhook() {
		if (this.webhook) return this.webhook;
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'defaultWebhook', undefined)).catch(() => null);
		this.webhook = webhook;
		return webhook;
	}

	async exec(guild) {
		if (!guild.available) return;
		this.client.logger.debug(`${guild.name} (${guild.id})`, { label: 'GUILD_DELETE' });

		await this.delete(guild);
		await this.client.firebase.post();
		await this.client.firebase.deletion();
		await this.client.firebase.guilds(guild.id, 0);

		const user = await this.client.users.fetch(guild.ownerID).catch(() => null);
		const webhook = await this.fetchWebhook().catch(() => null);
		if (webhook) {
			const embed = this.client.util.embed()
				.setColor(0xeb3508)
				.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL())
				.setTitle(`${emoji.owner} ${user.tag} (${user.id})`)
				.setFooter(`${guild.memberCount} members`, user.displayAvatarURL())
				.setTimestamp();
			return webhook.send({ embeds: [embed], username: 'ClashPerk', avatarURL: this.client.user.displayAvatarURL() });
		}
	}

	async delete(guild) {
		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find({ guild: guild.id })
			.toArray();

		collection.forEach(async data => {
			await this.client.cacheHandler.delete(data._id);
		});

		return collection.length;
	}
}

module.exports = GuildDeleteListener;
