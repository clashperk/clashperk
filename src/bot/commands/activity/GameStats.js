const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { BLUE_EMOJI, emoji } = require('../../util/Emojis');
const moment = require('moment');

class ClanGameStatsCommand extends Command {
	constructor() {
		super('cgstats', {
			aliases: ['cgstats'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: [
					'Compare clan games scoreboard among clans.',
					'',
					'Scoreboard is based on highest scores & completion times.',
					'Performance is based on completing maximum points.',
					'',
					'**Patron only Feature**',
					'',
					'[Become a Patron](https://www.patreon.com/clashperk)'
				],
				examples: ['']
			},
			args: [
				{
					id: 'guild',
					type: (msg, id) => this.client.guilds.cache.get(id) || null,
					default: message => message.guild
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { guild }) {
		if (!this.client.patron.check(message.author, message.guild)) {
			return this.handler.handleDirectCommand(message, 'cgstats', this.handler.modules.get('help'), false);
		}

		const db = mongodb.db('clashperk');
		const tags = await db.collection('clangameslogs').find({ guild: guild.id }).toArray();
		if (!tags.length) return message.util.send(`${message.guild.name} does not have any clans. Why not add some?`);
		const clans = await db.collection('clangames').find({ tag: { $in: [...tags.map(d => d.tag)] } }).toArray();
		if (clans.length <= 1) return message.util.send('Minimum 2 clans are required to use this command.');

		const maxPoint = this.client.cacheHandler.clanGamesLog.maxPoint;
		const performances = clans.map(d => {
			const members = Object.values(d.members)
				.filter(m => m.gain >= maxPoint);
			return {
				count: members.length,
				name: d.name,
				tag: d.tag
			};
		});
		performances.sort((a, b) => b.count - a.count);

		clans.sort((a, b) => b.total - a.total)
			.sort((a, b) => new Date(a?.endedAt) - new Date(b?.endedAt));

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('Clan Games Stats', message.guild.iconURL())
			.setFooter(`${moment(clans[0].updatedAt).format('MMMM YYYY')}`, this.client.user.displayAvatarURL())
			.setDescription([
				'**Scoreboard**',
				'Based on highest scores & completion times.',
				`${emoji.hash} **\`\u200e ${'SCORE'.padEnd(6, ' ')}  ${'CLAN'.padEnd(16, ' ')}\u200f\`**`,
				...clans.map((clan, i) => `${BLUE_EMOJI[++i]} \`\u200e ${(clan.total || 0).toString().padStart(6, ' ')}  ${clan.name.padEnd(16, ' ')}\u200f\``),
				'',
				'**Performance**',
				'Based on completing maximum points.',
				`${emoji.hash} **\`\u200e ${Math.floor(maxPoint / 1000)}K  ${'CLAN'.padEnd(20, ' ')}\u200f\`**`,
				...performances.map((clan, i) => `${BLUE_EMOJI[++i]} \`\u200e ${clan.count.toString().padStart(2, ' ')}  ${clan.name.padEnd(20, ' ')}\u200f\``)
			]);

		return message.util.send({ embed });
	}
}

module.exports = ClanGameStatsCommand;
