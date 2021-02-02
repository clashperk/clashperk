import { BLUE_EMOJI, EMOJIS } from '../../util/Emojis';
import { COLLECTIONS } from '../../util/Constants';
import { Message, Guild } from 'discord.js';
import { Command } from 'discord-akairo';
import moment from 'moment';

const MAX_POINT = 4000;

interface Prop {
	count: number;
	name: string;
	tag: string;
	total: number;
	endedAt?: any;
}

export default class ClanGamesScoresCommand extends Command {
	public constructor() {
		super('clan-games-scores', {
			aliases: ['scores', 'cgstats'],
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
					'id': 'guild',
					'type': (msg, id) => this.client.guilds.cache.get(id) ?? null,
					'default': (message: Message) => message.guild
				}
			]
		});
	}

	public async exec(message: Message, { guild }: { guild: Guild }) {
		if (!this.client.patrons.get(message.guild!.id)) {
			return this.handler.handleDirectCommand(message, 'cgstats', this.handler.modules.get('help')!, false);
		}

		const tags = await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.find({ guild: guild.id })
			.toArray();
		if (!tags.length) return message.util!.send(`${message.guild!.name} does not have any clans. Why not add some?`);

		const clans = await this.client.db.collection(COLLECTIONS.CLAN_GAMES)
			.find({ tag: { $in: [...tags.map(d => d.tag)] } })
			.toArray();
		if (clans.length < 2) return message.util!.send('Minimum 2 clans are required to use this command.');

		const performances: Prop[] = clans.map(clan => ({
			count: clan.maxCount,
			name: clan.name,
			tag: clan.tag,
			total: clan.total,
			endedAt: clan.endedAt
		}));

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('Clan Games Stats', message.guild!.iconURL()!)
			.setFooter(`${moment(clans[0].updatedAt).format('MMMM YYYY')}`, this.client.user!.displayAvatarURL())
			.setDescription([
				'**Scoreboard**',
				'Based on highest scores & completion times.',
				`${EMOJIS.HASH} **\`\u200e ${'SCORE'.padEnd(6, ' ')}  ${'CLAN'.padEnd(16, ' ')}\u200f\`**`,
				...performances
					.sort((a, b) => b.total - a.total).sort((a, b) => a.endedAt - b.endedAt)
					.map((clan, i) => `${BLUE_EMOJI[++i]} \`\u200e ${(clan.total || 0).toString().padStart(6, ' ')}  ${clan.name.padEnd(16, ' ')}\u200f\``),
				'',
				'**Performance**',
				'Based on completing maximum points.',
				`${EMOJIS.HASH} **\`\u200e ${Math.floor(MAX_POINT / 1000)}K  ${'CLAN'.padEnd(20, ' ')}\u200f\`**`,
				...performances.sort((a, b) => b.count - a.count)
					.map((clan, i) => `${BLUE_EMOJI[++i]} \`\u200e ${clan.count.toString().padStart(2, ' ')}  ${clan.name.padEnd(20, ' ')}\u200f\``)
			]);

		return message.util!.send({ embed });
	}
}
