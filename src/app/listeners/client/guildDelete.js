const { Listener } = require('discord-akairo');
const Clans = require('../../models/Clans');
const Logger = require('../../util/logger');

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

		for (const { id, tag } of await Clans.findAll({ where: { guild: guild.id } })) {
			this.client.tracker.delete(id, tag);
		}

		await Clans.destroy({ where: { guild: guild.id } });

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
}

module.exports = GuildDeleteListener;
