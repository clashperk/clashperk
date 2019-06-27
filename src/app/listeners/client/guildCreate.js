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

		await guild.fetch();

		const clientLog = this.client.settings.get('global', 'clientLog', undefined);
		if (clientLog && this.client.channels.has(clientLog)) {
			this.client.channels.get(clientLog).send({
				embed: {
					author: {
						name: `${guild.name} (${guild.id})`,
						icon_url: guild.iconURL()
					},
					title: `\\👑 ${guild.owner.user.tag} (${guild.owner.user.id})`,
					footer: {
						text: `${guild.memberCount} members`,
						icon_url: guild.owner.user.displayAvatarURL()
					},
					timestamp: new Date(),
					color: 0x38d863
				}
			});
		}
	}
}
module.exports = GuildCreateListener;
