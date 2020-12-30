import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class AboutCommand extends Command {
	public constructor() {
		super('about', {
			aliases: ['about'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about the bot.' }
		});
	}

	public async exec(message: Message) {
		const owner = await this.client.users.fetch(this.client.ownerID as string, false);
		let guilds = 0;
		const values = await this.client.shard!.broadcastEval('[this.guilds.cache.size]');
		for (const value of values) guilds += value[0];
		const clans = await this.client.db.collection('clanstores').find().count();
		const players = await this.client.db.collection('lastonlines').find().count();

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${this.client.user!.username}`, this.client.user!.displayAvatarURL(), 'https://clashperk.com')
			.setDescription([
				'Feature-Rich and Powerful Clash of Clans Discord bot with everything you will ever need.'
			])
			.addField('Developer', `${EMOJIS.BOT_DEV} **${owner.tag}**`)
			.addField('Library', `${EMOJIS.NODEJS} [discord.js](https://discord.js.org)`)
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
		return message.util!.send({ embed });
	}
}
