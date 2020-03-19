const { Command } = require('discord-akairo');

class AboutCommand extends Command {
	constructor() {
		super('about', {
			aliases: ['about', 'info', 'donate', 'patreon', 'support'],
			category: 'util',
			cooldown: 1000,
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about the bot.' }
		});
	}

	exec(message) {
		const owner = this.client.users.cache.get(this.client.ownerID);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`About ${this.client.user.username}`, this.client.user.displayAvatarURL())
			.addField('Developer', `[${owner.tag}](https://github.com/ndency)`, true)
			.addField('Library', '[discord.js#master](https://discord.js.org)', true)
			.addField('Support', '[Official Discord](https://discord.gg/ppuppun)', true)
			.addField('Website', '[Guide](https://clashperk.xyz)', true)
			.addField('Donate', '[Patreon](https://www.patreon.com/bePatron?u=14584309)', true)
			.setFooter(`© ${new Date().getFullYear()} ${owner.tag}`, owner.displayAvatarURL());
		return message.util.send({ embed });
	}
}

module.exports = AboutCommand;
