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
					color: 0x38d863
				}
			});
		}
	}
}
module.exports = GuildCreateListener;
