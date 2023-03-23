import {
	ActionRowBuilder,
	BaseInteraction,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	EmbedBuilder
} from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { clanGamesSortingAlgorithm } from '../../util/Helper.js';
import { ClanGames } from '../../util/index.js';
export default class SummaryClanGamesCommand extends Command {
	public constructor() {
		super('summary-clan-games', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		args: { tag?: string; max: boolean; filter: boolean; season?: string; clans?: string }
	) {
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const seasonId = this.getSeasonId(args.season);
		const queried = await this.query(
			clans.map((clan) => clan.tag),
			seasonId
		)!;
		const embed = this.clanScoreboard(interaction, {
			members: queried?.members ?? [],
			clans: queried?.clans ?? [],
			max: args.max,
			filter: args.filter,
			seasonId
		});
		const customIds = {
			times: this.client.uuid(interaction.user.id),
			points: this.client.uuid(interaction.user.id)
		};

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setLabel('Fastest Completion').setStyle(ButtonStyle.Primary).setCustomId(customIds.times)
		);

		await interaction.editReply({ embeds: [embed] });
		const msg = await interaction.followUp({
			embeds: [
				this.playerScoreboard(interaction, {
					members: queried?.members ?? [],
					clans: queried?.clans ?? [],
					max: args.max,
					seasonId
				})
			],
			components: [row]
		});

		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.times) {
				const embed = this.playerScoreboard(interaction, {
					members: queried?.members ?? [],
					clans: queried?.clans ?? [],
					max: args.max,
					seasonId,
					showTime: true
				});

				row.setComponents(new ButtonBuilder().setLabel('Show Points').setStyle(ButtonStyle.Primary).setCustomId(customIds.points));
				await action.update({ embeds: [embed], components: [row] });
			}

			if (action.customId === customIds.points) {
				const embed = this.playerScoreboard(interaction, {
					members: queried?.members ?? [],
					clans: queried?.clans ?? [],
					max: args.max,
					seasonId,
					showTime: false
				});

				row.setComponents(
					new ButtonBuilder().setLabel('Fastest Completion').setStyle(ButtonStyle.Primary).setCustomId(customIds.times)
				);
				await action.update({ embeds: [embed], components: [row] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private clanScoreboard(
		interaction: BaseInteraction,
		{
			clans,
			seasonId
		}: {
			members: { name: string; tag: string; points: number }[];
			clans: { name: string; tag: string; points: number }[];
			max?: boolean;
			filter?: boolean;
			seasonId: string;
		}
	) {
		const embed = new EmbedBuilder()
			.setAuthor({ name: `Family Clan Games Scoreboard`, iconURL: interaction.guild!.iconURL()! })
			.setDescription(
				[
					'```',
					` # POINTS  CLANS`,
					clans
						.slice(0, 99)
						.map((c, i) => {
							const points = this.padStart(c.points);
							return `\u200e${(++i).toString().padStart(2, ' ')} ${points}  ${c.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);
		embed.setFooter({ text: `Season ${seasonId}` });
		return embed;
	}

	private playerScoreboard(
		interaction: BaseInteraction,
		{
			members,
			max = false,
			seasonId,
			showTime
		}: {
			members: { name: string; tag: string; points: number; completedAt?: Date; timeTaken?: number }[];
			clans: { name: string; tag: string; points: number }[];
			max?: boolean;
			seasonId: string;
			showTime?: boolean;
		}
	) {
		const total = members.reduce((prev, mem) => prev + (max ? mem.points : Math.min(mem.points, this.MAX)), 0);
		members
			.sort((a, b) => b.points - a.points)
			.sort((a, b) => clanGamesSortingAlgorithm(a.completedAt?.getTime() ?? 0, b.completedAt?.getTime() ?? 0));
		const embed = new EmbedBuilder()
			.setAuthor({ name: 'Family Clan Games Scoreboard', iconURL: interaction.guild!.iconURL()! })
			.setDescription(
				[
					`**[${this.i18n('command.clan_games.title', { lng: interaction.locale })} (${seasonId})](https://clashperk.com/faq)**`,
					showTime
						? `\`\`\`\n\u200e\u2002# ${' '.padEnd(7, ' ')}  ${'NAME'.padEnd(20, ' ')}`
						: `\`\`\`\n\u200e\u2002# POINTS  ${'NAME'.padEnd(20, ' ')}`,
					members
						.slice(0, 99)
						.filter((d) => (showTime ? d.points >= this.MAX : true))
						.map((m, i) => {
							const completionTime = this._formatTime(m.timeTaken).padStart(7, ' ');
							const points = m.points.toString().padStart(5, ' ');
							if (showTime) {
								return `\u200e${(++i).toString().padStart(2, '\u2002')} ${completionTime}  ${m.name}`;
							}
							return `\u200e${(++i).toString().padStart(2, '\u2002')}  ${points}  ${m.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);

		embed.setFooter({ text: `Points: ${total} [Avg: ${(total / members.length).toFixed(2)}]` });
		embed.setTimestamp();
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

	private query(clanTags: string[], seasonId: string) {
		const _clanGamesStartTimestamp = moment(seasonId).add(21, 'days').hour(8).toDate().getTime();
		const cursor = this.client.db.collection(Collections.CLAN_GAMES_POINTS).aggregate<{
			clans: { name: string; tag: string; points: number }[];
			members: { name: string; tag: string; points: number; completedAt?: Date; timeTaken?: number }[];
		}>([
			{
				$match: { __clans: { $in: clanTags }, season: seasonId }
			},
			{
				$set: {
					clan: {
						$arrayElemAt: ['$clans', 0]
					}
				}
			},
			{
				$project: {
					points: {
						$subtract: ['$current', '$initial']
					},
					timeTaken: {
						$dateDiff: {
							startDate: '$completedAt',
							endDate: '$$NOW',
							unit: 'millisecond'
						}
					},
					completedAt: '$completedAt',
					name: 1,
					tag: 1,
					clan: { name: 1, tag: 1 }
				}
			},
			{
				$facet: {
					clans: [
						{
							$group: {
								_id: '$clan.tag',
								name: {
									$first: '$clan.name'
								},
								tag: {
									$first: '$clan.tag'
								},
								points: {
									$sum: {
										$min: ['$points', this.MAX]
									}
								}
							}
						},
						{
							$match: {
								_id: { $in: clanTags }
							}
						},
						{
							$sort: {
								points: -1
							}
						}
					],
					members: [
						{
							$sort: {
								points: -1
							}
						},
						{
							$sort: {
								timeTaken: -1
							}
						},
						{
							$set: {
								timeTaken: {
									$dateDiff: {
										startDate: new Date(_clanGamesStartTimestamp),
										endDate: '$completedAt',
										unit: 'millisecond'
									}
								}
							}
						},
						{
							$limit: 100
						}
					]
				}
			}
		]);

		return cursor.next()!;
	}

	private _formatTime(diff?: number) {
		if (!diff) return '';
		if (diff >= 24 * 60 * 60 * 1000) {
			return moment.duration(diff).format('d[d] h[h]', { trim: 'both mid' });
			// return time.length === 7 ? time.replace(/\s/g, '') : `${time}`;
		}
		return moment.duration(diff).format('h[h] m[m]', { trim: 'both mid' });
		// return time.length === 7 ? time.replace(/\s/g, '') : `${time}`;
	}
}
