const { Inhibitor } = require('discord-akairo');

class GuildBanInhibitor extends Inhibitor {
	constructor() {
		super('guildban', {
			reason: 'guildban'
		});
	}

	exec(message) {
		if (this.client.isOwner(message.author.id)) return false;
		if (!message.guild) return false;
		const blacklist = this.client.settings.get('global', 'guildBans', []);
		return blacklist.includes(message.guild.id);
	}
}

module.exports = GuildBanInhibitor;
