const { Command } = require('discord-akairo');
const { emoji } = require('../../util/emojis');

class AboutCommand extends Command {
	constructor() {
		super('about', {
			aliases: ['about'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about the bot.' }
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
		const owner = await this.client.users.fetch(this.client.ownerID, false);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${this.client.user.username}`, this.client.user.displayAvatarURL(), 'https://clashperk.com')
			.setDescription([
				'Feature-Rich and Powerful Clash of Clans Discord bot with everything you will ever need.'
			])
			.addField('Owner', `${emoji.botdev} **${owner.tag}**`)
			.addField('Library', `${emoji.nodejs} [discord.js](https://discord.js.org)`)
			.addField('Website', '[https://clashperk.com](https://clashperk.com/)')
			.addField('Need help?', 'Join [Support Discord](https://discord.gg/ppuppun)')
			.addField('Do you like the bot?', '[Become a Patron](https://www.patreon.com/clashperk)')
			.addField('Legal Notice', [
				'This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it.',
				'For more information see Supercell\'s [Fan Content Policy](https://www.supercell.com/fan-content-policy \'Fan Content Policy × Supercell\')'
			].join(' '));
		return message.util.send({ embed });
	}
}

module.exports = AboutCommand;
