import {
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ButtonInteraction,
	BaseInteraction,
	MessageType
} from 'discord.js';
import { Clan } from 'clashofclans.js';
import { Collections } from '../../util/Constants.js';
import { ClanGames } from '../../util/index.js';
import { Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { ClanGamesModel } from '../../types/index.js';

export default class ClanGamesCommand extends Command {
	public constructor() {
		super('clan-games', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: ['Clan Games points of clan members.', '', '**[How does it work?](https://clashperk.com/faq)**']
			},
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		args: { tag?: string; max: boolean; filter: boolean; season?: string }
	) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		const seasonId = this.getSeasonId(args.season);

		if (interaction.isButton() && interaction.message.type === MessageType.Default && this.latestSeason !== args.season) {
			return interaction.editReply({ components: [] });
		}

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

		const queried = await this.query(clan.tag, clan, seasonId);
		const members = this.filter(queried, memberList, seasonId);
		const embed = this.embed(interaction, { clan, members, max: args.max, filter: args.filter, seasonId });
		embed.setColor(this.client.embed(interaction));

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId(JSON.stringify({ cmd: this.id, max: false, tag: clan.tag, season: seasonId }))
					.setEmoji(EMOJIS.REFRESH)
					.setStyle(ButtonStyle.Secondary)
			)
			.addComponents(
				new ButtonBuilder()
					.setCustomId(JSON.stringify({ cmd: this.id, max: !args.max, filter: false, tag: clan.tag, season: seasonId }))
					.setLabel(args.max ? 'Permissible Points' : 'Maximum Points')
					.setStyle(ButtonStyle.Primary)
			);
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private embed(
		interaction: BaseInteraction,
		{
			clan,
			members,
			max = false,
			filter = false,
			seasonId
		}: { clan: Clan; members: Member[]; max?: boolean; filter?: boolean; seasonId: string }
	) {
		const total = members.reduce((prev, mem) => prev + (max ? mem.points : Math.min(mem.points, this.MAX)), 0);
		const embed = new EmbedBuilder().setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium }).setDescription(
			[
				`**[${this.i18n('command.clan_games.title', { lng: interaction.locale })} (${seasonId})](https://clashperk.com/faq)**`,
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
		);
		if (interaction.isButton() && interaction.message.type === MessageType.ChatInputCommand) {
			embed.setFooter({
				text: `Total Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]`
			});
		} else {
			embed.setFooter({ text: `Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]` });
			embed.setTimestamp();
		}

		return embed;
	}

	private get MAX() {
		const now = new Date();
		return now.getDate() >= 22 && ClanGames.isSpecial ? 5000 : 4000;
	}

	private padStart(num: number) {
		return num.toString().padStart(6, ' ');
	}

	private getSeasonId(seasonId?: string) {
		if (seasonId) return seasonId;
		return this.latestSeason;
	}

	private get latestSeason() {
		const now = new Date();
		if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
		return now.toISOString().substring(0, 7);
	}

	private query(clanTag: string, _clan: Clan, seasonId: string) {
		const cursor = this.client.db.collection(Collections.CLAN_GAMES_POINTS).aggregate<ClanGamesModel>([
			{
				$match: { __clans: clanTag, season: seasonId }
			},
			{
				$limit: 60
			}
		]);

		return cursor.toArray();
	}

	private filter(dbMembers: ClanGamesModel[], clanMembers: Member[], seasonId: string) {
		if (seasonId !== this.latestSeason) {
			return dbMembers
				.map((m) => ({
					tag: m.tag,
					name: m.name,
					points: m.current - m.initial,
					endedAt: m.completedAt
				}))
				.sort((a, b) => b.points - a.points)
				.sort((a, b) => {
					if (a.endedAt && b.endedAt) {
						return a.endedAt.getTime() - b.endedAt.getTime();
					}
					return 0;
				});
		}

		const members = clanMembers.map((member) => {
			const mem = dbMembers.find((m) => m.tag === member.tag);
			return {
				name: member.name,
				tag: member.tag,
				points: mem ? member.points - mem.initial : 0,
				endedAt: mem?.completedAt
			};
		});

		const missingMembers: Member[] = dbMembers
			.filter((mem) => !members.find((m) => m.tag === mem.tag))
			.map((mem) => ({
				name: mem.name,
				tag: mem.tag,
				points: mem.current - mem.initial,
				endedAt: mem.completedAt
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

interface Member {
	tag: string;
	name: string;
	points: number;
	endedAt?: Date | null;
}
