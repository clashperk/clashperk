import { ButtonInteraction, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';
import { handlePagination } from '../../util/Pagination.js';
import { Util } from '../../util/index.js';

export default class DonationsHistoryCommand extends Command {
	public constructor() {
		super('donations-history', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
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
			.collection(Collections.PLAYER_SEASONS)
			.aggregate<AggregatedResult>([
				{ $match: { tag: { $in: playerTags } } },
				{
					$match: {
						createdAt: {
							$gte: moment().startOf('month').subtract(12, 'month').toDate()
						}
					}
				},
				{ $sort: { _id: -1 } },
				{
					$set: {
						_troops: {
							$subtract: ['$troopsDonations.current', '$troopsDonations.initial']
						},
						_spells: {
							$subtract: ['$spellsDonations.current', '$spellsDonations.initial']
						},
						_sieges: {
							$multiply: [{ $subtract: ['$siegeMachinesDonations.current', '$siegeMachinesDonations.initial'] }, 30]
						}
					}
				},
				{
					$set: {
						donations: { $sum: ['$_troops', '$_spells', '$_sieges'] }
					}
				},
				{
					$group: {
						_id: '$tag',
						name: { $first: '$name' },
						tag: { $first: '$tag' },
						donations: {
							$sum: '$donations'
						},
						seasons: {
							$push: {
								season: '$season',
								clans: '$clans',
								donations: '$donations'
							}
						}
					}
				},
				{
					$sort: {
						donations: -1
					}
				}
			])
			.toArray();

		const embeds: EmbedBuilder[] = [];
		for (const chunk of Util.chunk(result, 15)) {
			const embed = new EmbedBuilder();
			embed.setColor(this.client.embed(interaction));
			embed.setTitle('Donation History (last 6 months)');

			chunk.forEach(({ name, tag, seasons }) => {
				embed.addFields({
					name: `${name} (${tag})`,
					value: [
						'```',
						`\u200e${'DON'.padStart(6, ' ')} ${'REC'.padStart(6, ' ')}    SEASON`,
						seasons
							.map((season) => {
								const { donations, donationsReceived } = Object.values(season.clans).reduce(
									(acc, cur) => {
										acc.donations += cur.donations.total;
										acc.donationsReceived += cur.donationsReceived.total;
										return acc;
									},
									{ donations: 0, donationsReceived: 0 }
								);
								return `${Util.formatNumber(Math.max(donations, season.donations)).padStart(6, ' ')} ${Util.formatNumber(
									donationsReceived
								).padStart(6, ' ')}  ${moment(season.season).format('MMM YYYY')}`;
							})
							.join('\n'),
						'```'
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
				const records = r.seasons.reduce<Record<string, ISeason>>((prev, acc) => {
					prev[acc.season] ??= { ...acc, donationsReceived: 0 }; // eslint-disable-line
					const { donations, donationsReceived } = Object.values(acc.clans).reduce(
						(_acc, _cur) => {
							_acc.donations += _cur.donations.total;
							_acc.donationsReceived += _cur.donationsReceived.total;
							return _acc;
						},
						{ donations: 0, donationsReceived: 0 }
					);
					prev[acc.season].donations = Math.max(donations, prev[acc.season].donations);
					prev[acc.season].donationsReceived = donationsReceived;
					return prev;
				}, {});
				return { name: r.name, tag: r.tag, records };
			})
			.flat();

		const seasonIds = Util.getSeasonIds().slice(0, 12);
		const sheets: CreateGoogleSheet[] = [
			{
				title: `Donated`,
				columns: [
					{ name: 'NAME', align: 'LEFT', width: 160 },
					{ name: 'TAG', align: 'LEFT', width: 160 },
					...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
				],
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.records[id]?.donations ?? 0)])
			},
			{
				title: `Received`,
				columns: [
					{ name: 'NAME', align: 'LEFT', width: 160 },
					{ name: 'TAG', align: 'LEFT', width: 160 },
					...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
				],
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.records[id]?.donationsReceived ?? 0)])
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Donations History]`, sheets);
		return interaction.editReply({ components: getExportComponents(spreadsheet) });
	}
}

interface ISeason {
	clans: Record<
		string,
		{
			donations: { total: number };
			donationsReceived: { total: number };
		}
	>;
	season: string;
	donations: number;
	donationsReceived: number;
}

interface AggregatedResult {
	name: string;
	tag: string;
	seasons: ISeason[];
}
