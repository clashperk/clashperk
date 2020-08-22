const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { blueNum } = require('../../util/emojis');

class ClanGameStatsCommand extends Command {
	constructor() {
		super('cgstats', {
			aliases: ['cgstats'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: [
					'Compare clan games score among clans.',
					'Sorted by completion time and highest scores.',
					'',
					'**Patron only Feature**',
					'',
					'[Become a Patron](https://www.patreon.com/clashperk)'
				],
				examples: ['']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
		if (!this.client.patron.check(message.author, message.guild)) {
			return this.handler.handleDirectCommand(message, 'cgstats', this.handler.modules.get('help'), false);
		}

		const db = mongodb.db('clashperk');
		const tags = await db.collection('clangameslogs').find({ guild: message.guild.id }).toArray();
		if (!tags.length) return message.util.send(`${message.guild.name} does not have any clans. Why not add some?`);
		const clans = await db.collection('clangames').find({ tag: { $in: [...tags.map(d => d.tag)] } }).toArray();
		if (clans.length <= 1) return message.util.send('Minimum 2 clans are required to use this command.');

		const performances = clans.map(d => {
			const members = Object.values(d.members)
				.filter(m => m.gain >= 4000);
			return {
				count: members.length,
				name: d.name,
				tag: d.tag
			};
		});
		performances.sort((a, b) => b.count - a.count);

		const now = new Date();
		clans.sort((a, b) => new Date(b?.endedAt ?? now) - new Date(a?.endedAt ?? now))
			.sort((a, b) => b.total - a.total);

		const padSize = [...clans.map(d => d?.total ?? 0)].sort((a, b) => b - a)[0].toString().length;
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('Clan Games Stats')
			.setDescription([
				'**Soreboard**',
				'Based on completion times & highest sores.',
				...clans.map((clan, i) => `${blueNum[++i]} \`\u200e ${(clan.total || 0).toString().padEnd(padSize, ' ')} ${clan.name.padEnd(15, ' ')}\u200f\``),
				'',
				'**Performance**',
				'Based on 4K points completion.',
				...performances.map((clan, i) => `${blueNum[++i]} \`\u200e ${clan.count.toString().padEnd(2, ' ')} ${clan.name.padEnd(15, ' ')}\u200f\``)
			]);

		return message.util.send({ embed });
	}
}

module.exports = ClanGameStatsCommand;
