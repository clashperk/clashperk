import {
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ButtonInteraction,
	MessageType,
	User
} from 'discord.js';
import { Clan, Player } from 'clashofclans.js';
import moment from 'moment';
import { Collections } from '../../util/Constants.js';
import { ClanGames } from '../../util/index.js';
import { Args, Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { ClanGamesModel } from '../../types/index.js';
import { clanGamesEmbedMaker } from '../../util/Helper.js';

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

	public args(): Args {
		return {
			clan_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		args: { tag?: string; player_tag?: string; max: boolean; filter: boolean; season?: string; user?: User }
	) {
		if ((args.user || args.player_tag) && !interaction.isButton()) {
			const player = args.player_tag ? await this.client.resolver.resolvePlayer(interaction, args.player_tag) : null;
			if (args.player_tag && !player) return null;
			return this.forUsers(interaction, { user: args.user, player });
		}

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

		const embed = clanGamesEmbedMaker(clan, { members, filters: { maxPoints: args.max, minPoints: args.filter }, seasonId });
		if (interaction.isButton() && interaction.message.type === MessageType.ChatInputCommand) {
			embed.setFooter({
				text: embed.data.footer!.text,
				iconURL: interaction.user.displayAvatarURL()
			});
		}
		if (this.latestSeason !== seasonId) embed.setTimestamp(null);

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

	private async forUsers(interaction: CommandInteraction<'cached'>, { player, user }: { player?: Player | null; user?: User }) {
		const playerTags = player ? [player.tag] : await this.client.resolver.getLinkedPlayerTags(user!.id);
		const _players = await this.client.db
			.collection(Collections.CLAN_GAMES_POINTS)
			.aggregate<{ name: string; tag: string; seasons: { points: number; season: string }[] }>([
				{
					$match: {
						tag: {
							$in: [...playerTags]
						}
					}
				},
				{
					$set: {
						points: {
							$subtract: ['$current', '$initial']
						},
						clan: {
							$arrayElemAt: ['$clans', 0]
						}
					}
				},
				{
					$project: {
						name: 1,
						tag: 1,
						clan: 1,
						points: 1,
						season: 1
					}
				},
				{
					$sort: {
						_id: -1
					}
				},
				{
					$group: {
						_id: '$tag',
						name: {
							$first: '$name'
						},
						tag: {
							$first: '$tag'
						},
						seasons: {
							$push: {
								points: '$points',
								season: '$season',
								clan: {
									name: '$clan.name',
									tag: '$clan.tag'
								}
							}
						}
					}
				}
			])
			.toArray();

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));
		embed.setTitle('Clan games history (last 6 months)');
		if (user && !player) embed.setAuthor({ name: `${user.tag} (${user.id})`, iconURL: user.displayAvatarURL() });

		_players.sort((a, b) => b.seasons.length - a.seasons.length);
		_players.slice(0, 25).forEach((player) => {
			const total = player.seasons.reduce((a, b) => a + b.points, 0);
			embed.addFields({
				name: `${EMOJIS.AUTHORIZE} ${player.name} (${player.tag})`,
				value: [
					`\`\`\`\n\u200e # POINTS  SEASON`,
					player.seasons
						.slice(0, 24)
						.map((m, n) => {
							return `\u200e${(n + 1).toString().padStart(2, ' ')} ${m.points.toString().padStart(6, ' ')}  ${moment(
								m.season
							).format('MMM YY')}`;
						})
						.join('\n'),
					`\`\`\`Total: ${total} (Avg: ${(total / player.seasons.length).toFixed(2)})`
				].join('\n')
			});
		});

		return interaction.editReply({ embeds: [embed] });
	}

	private get MAX() {
		const now = new Date();
		return now.getDate() >= 22 && ClanGames.isSpecial ? 5000 : 4000;
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
