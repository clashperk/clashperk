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

		const clans = await Clans.findAll(guild);
		for (const clan of clans) {
			this.client.tracker.delete(guild.id, clan.tag);
		}

		const user = await this.client.users.fetch(guild.ownerID).catch(() => null);
		const clientLog = this.client.settings.get('global', 'clientLog', undefined);
		if (clientLog && this.client.channels.has(clientLog)) {
			this.client.channels.get(clientLog).send({
				embed: {
					author: {
						name: `${guild.name} (${guild.id})`,
						icon_url: guild.iconURL()
					},
					title: `\\👑 ${user.tag} (${user.id})`,
					footer: {
						text: `${guild.memberCount} members`,
						icon_url: user.displayAvatarURL()
					},
					timestamp: new Date(),
					color: 0xeb3508
				}
			});
		}
	}
}

module.exports = GuildDeleteListener;
