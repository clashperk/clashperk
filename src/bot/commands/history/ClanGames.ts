import { ButtonInteraction, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { getExportComponents } from '../../util/Helper.js';
import { Util } from '../../util/index.js';
import { handlePagination } from '../../util/Pagination.js';

export default class ClanGamesHistoryCommand extends Command {
	public constructor() {
		super('clan-games-history', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; player_tag?: string; user?: User }) {
		if (args.user) {
			const playerTags = await this.client.resolver.getLinkedPlayerTags(args.user.id);
			const { embeds, result } = await this.getHistory(interaction, playerTags);
			if (!result.length) {
				return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
			}
			return handlePagination(interaction, embeds, (action) => this.export(action, result));
		}

		if (args.player_tag) {
			const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
			if (!player) return null;
			const playerTags = [player.tag];
			const { embeds, result } = await this.getHistory(interaction, playerTags);
			if (!result.length) {
				return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
			}
			return handlePagination(interaction, embeds, (action) => this.export(action, result));
		}

		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
		const playerTags = _clans.flatMap((clan) => clan.memberList.map((member) => member.tag));
		const { embeds, result } = await this.getHistory(interaction, playerTags);
		if (!result.length) {
			return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		}
		return handlePagination(interaction, embeds, (action) => this.export(action, result));
	}

	private async getHistory(interaction: CommandInteraction<'cached'>, playerTags: string[]) {
		const result = await this.client.db
			.collection(Collections.CLAN_GAMES_POINTS)
			.aggregate<AggregatedResult>([
				{
					$match: {
						tag: {
							$in: [...playerTags]
						},
						createdAt: {
							$gte: moment().startOf('month').subtract(12, 'month').toDate()
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

		result.sort((a, b) => b.seasons.length - a.seasons.length);

		const embeds: EmbedBuilder[] = [];
		for (const chunk of Util.chunk(result, 15)) {
			const embed = new EmbedBuilder();
			embed.setColor(this.client.embed(interaction));
			embed.setTitle('Clan Games History (last 12 months)');

			chunk.forEach((player) => {
				const total = player.seasons.reduce((a, b) => a + b.points, 0);
				embed.addFields({
					name: `${player.name} (${player.tag})`,
					value: [
						`\`\`\`\n\u200e # POINTS  SEASON`,
						player.seasons
							.slice(0, 12)
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

			embeds.push(embed);
		}

		return { embeds, result };
	}

	private async export(interaction: ButtonInteraction<'cached'>, result: AggregatedResult[]) {
		const chunks = result
			.map((r) => {
				const seasons = r.seasons.reduce<
					Record<
						string,
						{
							clan: {
								name: string;
								tag: string;
							};
							points: number;
							season: string;
						}
					>
				>((prev, acc) => {
					prev[acc.season] ??= acc; // eslint-disable-line
					return prev;
				}, {});
				return { name: r.name, tag: r.tag, seasons };
			})
			.flat();

		const seasonIds = Util.getSeasonIds();
		const sheets: CreateGoogleSheet[] = [
			{
				title: `Clan Games History`,
				columns: [
					{ name: 'NAME', align: 'LEFT', width: 160 },
					{ name: 'TAG', align: 'LEFT', width: 160 },
					...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
				],
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.seasons[id]?.points ?? 0)])
			}
		];

		const spreadsheet = await createGoogleSheet(`[${interaction.guild.name}] Clan Games History`, sheets);
		return interaction.editReply({ components: getExportComponents(spreadsheet) });
	}
}

interface AggregatedResult {
	name: string;
	tag: string;
	seasons: {
		points: number;
		season: string;
		clan: {
			name: string;
			tag: string;
		};
	}[];
}
