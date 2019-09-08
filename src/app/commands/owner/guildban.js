const { Command } = require('discord-akairo');

class GuildBanCommand extends Command {
	constructor() {
		super('guildban', {
			aliases: ['guildban'],
			description: {
				content: 'You can\'t use this anyway, so why explain?',
				usage: '<guild>',
				examples: ['81440962496172032']
			},
			category: 'owner',
			ownerOnly: true,
			args: [
				{
					id: 'guild',
					match: 'content',
					type: 'guild',
					prompt: {
						start: 'who would you like to blacklist/unblacklist?'
					}
				}
			]
		});
	}

	exec(message, { guild }) {
		const blacklist = this.client.settings.get('global', 'guildban', []);
		if (blacklist.includes(guild.id)) {
			const index = blacklist.indexOf(guild.id);
			blacklist.splice(index, 1);
			if (blacklist.length === 0) this.client.settings.delete('global', 'guildban');
			else this.client.settings.set('global', 'guildban', blacklist);

			return message.util.send(`**${guild.name}** has been removed from the ${this.client.user.username}'s blacklist.`);
		}

		blacklist.push(guild.id);
		this.client.settings.set('global', 'guildban', blacklist);

		return message.util.send(`**${guild.name}** has been blacklisted from using ${this.client.user.username}'s command.`);
	}
}

module.exports = GuildBanCommand;
