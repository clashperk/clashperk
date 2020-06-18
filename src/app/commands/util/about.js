const { Command } = require('discord-akairo');
const { oneLine } = require('common-tags');
const { emoji } = require('../../util/emojis');

class AboutCommand extends Command {
	constructor() {
		super('about', {
			aliases: ['about'],
			category: 'util',
			cooldown: 1000,
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about the bot.' }
		});
	}

	async exec(message) {
		const owner = await this.client.users.fetch(this.client.ownerID, false);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`About ${this.client.user.username}`, this.client.user.displayAvatarURL())
			.setDescription([
				'Feature-Rich and Powerful Clash of Clans Discord bot with everything you will ever need.'
			])
			.addField('Owner', `${emoji.botdev} **${owner.tag}**`)
			.addField('Library', '[discord.js](https://discord.js.org)')
			.addField('Need help?', 'Join [Official Discord](https://discord.gg/ppuppun)')
			.addField('Do you like the bot?', 'Please support on us [Patreon](https://www.patreon.com/bePatron?u=14584309)')
			.addField('Legal Notice', [
				oneLine(`This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it.
				For more information see Supercell\'s [Fan Content Policy](https://www.supercell.com/fan-content-policy 'Fan Content Policy × Supercell')`)
			])
			.setFooter(`© ${new Date().getFullYear()} ${owner.tag}`, owner.displayAvatarURL());
		return message.util.send({ embed });
	}
}

module.exports = AboutCommand;
