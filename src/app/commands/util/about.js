const { Command } = require('discord-akairo');

class AboutCommand extends Command {
	constructor() {
		super('about', {
			aliases: ['about', 'info', 'donate', 'patreon'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about the bot.' }
		});
	}

	exec(message) {
		const owner = this.client.users.get(this.client.ownerID);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`About ${this.client.user.username}`, this.client.user.displayAvatarURL())
			.addField('Developer', `**[${owner.tag}](https://github.com/esuvajit)**`, true)
			.addField('Library', '[discord.js#master](https://discord.js.org)', true)
			.addField('Support', '[Official Discord](https://discord.gg/8NP2XNV)', true)
			.addField('Host', '[Google Cloud](https://console.cloud.google.com)', true)
			.addField('Donate', [
				'Help me to keep this bot alive.',
				'Support ClashPerk on **[Patreon](https://www.patreon.com/bePatron?u=14584309)**'
			])
			.setFooter(`© 2019 ${owner.tag}`, owner.displayAvatarURL());
		return message.util.send({ embed });
	}
}

module.exports = AboutCommand;
