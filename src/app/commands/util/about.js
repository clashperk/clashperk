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
		let guilds = 0;
		const values = await this.client.shard.broadcastEval('[this.guilds.cache.size]');
		for (const value of values) guilds += value[0];
		const clans = await this.client.mongodb.collection('clanstores').find().count();
		const players = await this.client.mongodb.collection('lastonlines').find().count();

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${this.client.user.username}`, this.client.user.displayAvatarURL(), 'https://clashperk.com')
			.setDescription([
				'Feature-Rich and Powerful Clash of Clans Discord bot with everything you will ever need.'
			])
			.addField('Developer', `${emoji.botdev} **${owner.tag}**`)
			.addField('Library', `${emoji.nodejs} [discord.js](https://discord.js.org)`)
			.addField('Stats', [
				`${guilds.toLocaleString()} servers, ${clans.toLocaleString()} clans, ${players.toLocaleString()} players`
			])
			.addField('Website', '[https://clashperk.com](https://clashperk.com/)')
			.addField('Need help?', 'Join [Support Discord](https://discord.gg/ppuppun)')
			.addField('Do you like the bot?', '[Become a Patron](https://www.patreon.com/clashperk)')
			.addField('Disclaimer', [
				'This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it.',
				'For more information see Supercell\'s [Fan Content Policy](https://www.supercell.com/fan-content-policy \'Fan Content Policy × Supercell\')'
			].join(' '));
		return message.util.send({ embed });
	}
}

module.exports = AboutCommand;
