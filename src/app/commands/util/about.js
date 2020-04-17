const { Command } = require('discord-akairo');

class AboutCommand extends Command {
	constructor() {
		super('about', {
			aliases: ['about', 'info'],
			category: 'util',
			cooldown: 1000,
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about the ClashPerk.' }
		});
	}

	exec(message) {
		const owner = this.client.users.cache.get(this.client.ownerID);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`About ${this.client.user.username}`, this.client.user.displayAvatarURL())
			.addField('Developer', `[${owner.tag}](https://github.com/ndency)`)
			.addField('Library', '[discord.js#master](https://discord.js.org)')
			.addField('Support', '[Official Discord](https://discord.gg/ppuppun)')
			.addField('Website', '[Guide](https://clashperk.xyz)')
			.addField('Donate', '[Patreon](https://www.patreon.com/bePatron?u=14584309)')
			.setFooter(`© ${new Date().getFullYear()} ${owner.tag}`, owner.displayAvatarURL());
		return message.util.send({ embed });
	}
}

module.exports = AboutCommand;
