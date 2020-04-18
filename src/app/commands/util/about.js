const { Command } = require('discord-akairo');

class AboutCommand extends Command {
	constructor() {
		super('about', {
			aliases: ['about'],
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
			.setDescription([
				'ClashPerk is Clash of Clans Discord Bot for activity tracking (donations, last-online, players leave/join, clan games, cwl), searching players, clans, war log, cwl etc..'
			])
			.addField('Author', `[${owner.tag}](https://github.com/ndency)`)
			.addField('Library', '[discord.js](https://discord.js.org)')
			.addField('Support', '[Official Discord](https://discord.gg/ppuppun)')
			.addField('Website', '[Guide](https://clashperk.xyz)')
			.addField('Donate', '[Patreon](https://www.patreon.com/bePatron?u=14584309)')
			.addField('Notice', [
				'This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it.',
				'For more information see Supercell\'s Fan Content Policy https://www.supercell.com/fan-content-policy'
			])
			.setFooter(`© ${new Date().getFullYear()} ${owner.tag}`, owner.displayAvatarURL());
		return message.util.send({ embed });
	}
}

module.exports = AboutCommand;
