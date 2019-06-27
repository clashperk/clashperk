const { Command } = require('discord-akairo');

class AboutCommand extends Command {
	constructor() {
		super('about', {
			aliases: ['about', 'info'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about the bot.' }
		});
	}

	exec(message) {
		const owner = this.client.users.get(this.client.ownerID);
		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor('About ClashPerks', this.client.user.displayAvatarURL())
			.addField('Developer', `**[${owner.tag}](https://github.com/esuvajit)**`)
			.addField('Library', '[discord.js-](https://discord.js.org)[akairo](https://discord-akairo.github.io/#/)')
			.addField('Database', '[PostgreSQL](https://www.postgresql.org/)')
			.addField('Host', '[Google Cloud Platform](https://console.cloud.google.com)')
			.addField('Support', [
				'If you are struggling with any feature/command, if you find any bug or have any good idea of new feature/command, dm me or join my [Discord](https://discord.gg/8NP2XNV)',
				'',
				'Help me to keep this bot alive. Support ClashPerks on **[Patreon](https://www.patreon.com/bePatron?u=14584309)**',
				'',
				`Use \`${prefix}stats\` for statistics and \`${prefix}invite\` for an invite link.`
			])
			.setFooter(`© 2018 - 2019 ${owner.tag}`, owner.displayAvatarURL());
		return message.util.send({ embed });
	}
}

module.exports = AboutCommand;
