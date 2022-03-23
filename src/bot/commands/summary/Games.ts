import { ClanGames } from '../../util';
import { Collections, Messages } from '../../util/Constants';
import { BLUE_NUMBERS, EMOJIS } from '../../util/Emojis';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Command } from '../../lib';
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
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			defer: true
		});
	}

	private seasonID(season?: string) {
		if (!season) {
			const now = new Date();
			if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
			return now.toISOString().substring(0, 7);
		}
		const now = season === 'last' ? new Date() : new Date(season);
		if (season === 'last') now.setMonth(now.getMonth() - 1);
		return now.toISOString().substring(0, 7);
	}

	public async exec(interaction: CommandInteraction, { season }: { season: string }) {
		const tags = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild!.id }).toArray();
		if (!tags.length) return interaction.editReply(Messages.SERVER.NO_CLANS_LINKED);

		const clans = await this.client.db
			.collection(Collections.CLAN_GAMES)
			.find({ season: this.seasonID(season), tag: { $in: [...tags.map((d) => d.tag)] } })
			.toArray();

		const patron = this.client.patrons.get(interaction.guild!.id);
		if ((clans.length < 3 && !patron) || clans.length < 2) {
			return interaction.editReply(`**You must have minimum ${patron ? 2 : 3} clans in your server to use this command.**`);
		}

		const performances: Prop[] = clans.map((clan) => ({
			count: clan.maxCount,
			name: clan.name,
			tag: clan.tag,
			total: clan.total,
			endedAt: clan.endedAt
		}));

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: 'Clan Games Stats', iconURL: interaction.guild!.iconURL()! })
			.setFooter({
				text: `${moment(clans[0].createdAt).format('MMMM YYYY')}`,
				iconURL: this.client.user!.displayAvatarURL({ format: 'png' })
			})
			.setDescription(
				[
					'**Scoreboard**',
					'Based on highest scores and completion times.',
					`${EMOJIS.HASH} **\`\u200e  ${'SCORE'.padEnd(6, ' ')} ${'CLAN'.padEnd(16, ' ')}\u200f\`**`,
					...performances
						.sort((a, b) => b.total - a.total)
						.sort((a, b) => a.endedAt - b.endedAt)
						.map(
							(clan, i) =>
								`${BLUE_NUMBERS[++i]} \`\u200e ${(clan.total || 0).toString().padStart(6, ' ')}  ${clan.name.padEnd(
									16,
									' '
								)}\u200f\``
						),
					'',
					'**Performance**',
					'Based on completing maximum points.',
					`${EMOJIS.HASH} **\`\u200e ${Math.floor(this.MAX / 1000)}K  ${'CLAN'.padEnd(20, ' ')}\u200f\`**`,
					...performances
						.sort((a, b) => b.count - a.count)
						.map(
							(clan, i) =>
								`${BLUE_NUMBERS[++i]} \`\u200e ${clan.count.toString().padStart(2, ' ')}  ${clan.name.padEnd(
									20,
									' '
								)}\u200f\``
						)
				].join('\n')
			);

		return interaction.editReply({ embeds: [embed] });
	}

	private get MAX() {
		const now = new Date();
		return now.getDate() >= 22 && ClanGames.isSpecial ? 5000 : 4000;
	}
}
