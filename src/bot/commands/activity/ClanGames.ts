import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { Collections } from '../../util/Constants';
import { ClanGames } from '../../util';
import { Command } from '../../lib';
import { EMOJIS } from '../../util/Emojis';

export default class ClanGamesCommand extends Command {
	public constructor() {
		super('clan-games', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: ['Clan Games points of clan members.', '', '**[How does it work?](https://clashperk.com/faq)**']
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; max: boolean; filter: boolean }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const allowed = await this.client.db
			.collection(Collections.CLAN_STORES)
			.countDocuments({ guild: interaction.guild.id, tag: clan.tag });
		if (!allowed && interaction.guild.id !== '509784317598105619') {
			return interaction.editReply(
				this.i18n('common.guild_unauthorized', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		const fetched = await this.client.http.detailedClanMembers(clan.memberList);
		const memberList = fetched
			.filter((res) => res.ok)
			.map((m) => {
				const value = m.achievements.find((a) => a.name === 'Games Champion')?.value ?? 0;
				return { tag: m.tag, name: m.name, points: value };
			});

		const queried = await this.query(clan.tag, clan);
		const members = this.filter(queried, memberList);
		const embed = this.embed(clan, members, args.max, args.filter).setColor(this.client.embed(interaction));

		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(JSON.stringify({ cmd: this.id, max: false }))
					.setEmoji(EMOJIS.REFRESH)
					.setStyle('SECONDARY')
			)
			.addComponents(
				new MessageButton()
					.setCustomId(JSON.stringify({ cmd: this.id, max: !args.max, filter: false }))
					.setLabel(args.max ? 'Permissible Points' : 'Maximum Points')
					.setStyle('PRIMARY')
			);
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private embed(clan: Clan, members: Member[], max = false, filter = false) {
		const total = members.reduce((prev, mem) => prev + (max ? mem.points : Math.min(mem.points, this.MAX)), 0);
		const embed = new MessageEmbed()
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
			.setDescription(
				[
					`**[Clan Games Scoreboard (${this.seasonId})](https://clashperk.com/faq)**`,
					`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
					members
						.slice(0, 55)
						.filter((d) => (filter ? d.points > 0 : d.points >= 0))
						.map((m, i) => {
							const points = this.padStart(max ? m.points : Math.min(this.MAX, m.points));
							return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			)
			.setFooter({
				text: `Total Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]`
			});
		return embed;
	}

	private get MAX() {
		const now = new Date();
		return now.getDate() >= 22 && ClanGames.isSpecial ? 5000 : 4000;
	}

	private padStart(num: number) {
		return num.toString().padStart(6, ' ');
	}

	private get seasonId() {
		const now = new Date();
		if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
		return now.toISOString().substring(0, 7);
	}

	private query(clanTag: string, clan: Clan) {
		const cursor = this.client.db.collection(Collections.CLAN_MEMBERS).aggregate<DBMember>([
			{
				$match: { clanTag }
			},
			{
				$match: {
					season: this.seasonId
				}
			},
			{
				$match: {
					$or: [
						{
							tag: {
								$in: clan.memberList.map((m) => m.tag)
							}
						},
						{
							clanGamesTotal: { $gt: 0 }
						}
					]
				}
			},
			{
				$limit: 60
			}
		]);

		return cursor.toArray();
	}

	private filter(dbMembers: DBMember[] = [], clanMembers: Member[] = []) {
		const members = clanMembers.map((member) => {
			const mem = dbMembers.find((m) => m.tag === member.tag);
			const ach = mem?.achievements.find((m) => m.name === 'Games Champion');
			return {
				name: member.name,
				tag: member.tag,
				points: mem ? member.points - ach!.value : 0,
				endedAt: mem?.clanGamesEndTime
			};
		});

		const missingMembers: Member[] = dbMembers
			.filter((mem) => !members.find((m) => m.tag === mem.tag))
			.map((mem) => ({
				name: mem.name,
				tag: mem.tag,
				points: mem.achievements.find((m) => m.name === 'Games Champion')!.gained,
				endedAt: mem.clanGamesEndTime
			}));

		return [...members, ...missingMembers]
			.sort((a, b) => b.points - a.points)
			.sort((a, b) => {
				if (a.endedAt && b.endedAt) {
					return a.endedAt.getTime() - b.endedAt.getTime();
				}
				return 0;
			});
	}
}

interface DBMember {
	tag: string;
	name: string;
	achievements: {
		gained: number;
		name: string;
		value: number;
	}[];
	clanGamesEndTime?: Date;
}

interface Member {
	tag: string;
	name: string;
	points: number;
	endedAt?: Date;
}
