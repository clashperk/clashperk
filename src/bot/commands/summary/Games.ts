import { ClanGames, Util } from '../../util/Util';
import { Collections } from '../../util/Constants';
import { BLUE_NUMBERS } from '../../util/NumEmojis';
import { Message, MessageEmbed } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import moment from 'moment';

interface Prop {
	count: number;
	name: string;
	tag: string;
	total: number;
	endedAt?: any;
}

export default class ClanGamesSummaryCommand extends Command {
	public constructor() {
		super('clan-games-summary', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {},
			optionFlags: ['--season']
		});
	}

	public *args(msg: Message): unknown {
		const season = yield {
			flag: '--season',
			type: [...Util.getSeasonIds(), ['last']],
			match: msg.interaction ? 'option' : 'phrase'
		};

		return { season };
	}

	private seasonID(season?: string) {
		if (!season) {
			const now = new Date();
			if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
			return now.toISOString().substring(0, 7);
		}
		const now = (season === 'last') ? new Date() : new Date(season);
		if (season === 'last') now.setMonth(now.getMonth() - 1);
		return now.toISOString().substring(0, 7);
	}

	public async exec(message: Message, { season }: { season: string }) {
		const tags = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();
		if (!tags.length) return message.util!.send(`**${message.guild!.name} does not have any clans. Why not add some?**`);

		console.log(this.seasonID(season), season);
		const clans = await this.client.db.collection(Collections.CLAN_GAMES)
			.find({ season: this.seasonID(season), tag: { $in: [...tags.map(d => d.tag)] } })
			.toArray();

		const patron = this.client.patrons.get(message.guild!.id);
		if ((clans.length < 3 && !patron) || clans.length < 2) {
			return message.util!.send(`**You must have minimum ${patron ? 2 : 3} clans in your server to use this command.**`);
		}

		const performances: Prop[] = clans.map(clan => ({
			count: clan.maxCount,
			name: clan.name,
			tag: clan.tag,
			total: clan.total,
			endedAt: clan.endedAt
		}));

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor('Clan Games Stats', message.guild!.iconURL()!)
			.setFooter(`${moment(clans[0].createdAt).format('MMMM YYYY')}`, this.client.user!.displayAvatarURL())
			.setDescription([
				'**Scoreboard**',
				'Based on highest scores and completion times.',
				`${EMOJIS.HASH} **\`\u200e  ${'SCORE'.padEnd(6, ' ')} ${'CLAN'.padEnd(16, ' ')}\u200f\`**`,
				...performances
					.sort((a, b) => b.total - a.total).sort((a, b) => a.endedAt - b.endedAt)
					.map((clan, i) => `${BLUE_NUMBERS[++i]} \`\u200e ${(clan.total || 0).toString().padStart(6, ' ')}  ${clan.name.padEnd(16, ' ')}\u200f\``),
				'',
				'**Performance**',
				'Based on completing maximum points.',
				`${EMOJIS.HASH} **\`\u200e ${Math.floor(ClanGames.MAX_POINT / 1000)}K  ${'CLAN'.padEnd(20, ' ')}\u200f\`**`,
				...performances.sort((a, b) => b.count - a.count)
					.map((clan, i) => `${BLUE_NUMBERS[++i]} \`\u200e ${clan.count.toString().padStart(2, ' ')}  ${clan.name.padEnd(20, ' ')}\u200f\``)
			].join('\n'));

		return message.util!.send({ embeds: [embed] });
	}
}
