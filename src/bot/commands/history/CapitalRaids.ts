import { ButtonInteraction, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';
import { handlePagination } from '../../util/Pagination.js';
import { Util } from '../../util/index.js';

export default class CapitalRaidsHistoryCommand extends Command {
	public constructor() {
		super('capital-raids-history', {
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
			.collection(Collections.CAPITAL_RAID_SEASONS)
			.aggregate<AggregatedResult>([
				{
					$match: {
						'members.tag': {
							$in: [...playerTags]
						},
						'createdAt': {
							$gte: moment().startOf('month').subtract(3, 'month').toDate()
						}
					}
				},
				{
					$unwind: {
						path: '$members'
					}
				},
				{
					$match: {
						'members.tag': {
							$in: [...playerTags]
						}
					}
				},
				{
					$sort: {
						_id: -1
					}
				},
				{
					$group: {
						_id: '$members.tag',
						name: {
							$first: '$members.name'
						},
						tag: {
							$first: '$members.tag'
						},
						raids: {
							$push: {
								weekId: '$weekId',
								clan: {
									name: '$name',
									tag: '$tag'
								},
								name: '$members.name',
								tag: '$members.tag',
								attacks: '$members.attacks',
								attackLimit: '$members.attackLimit',
								bonusAttackLimit: '$members.bonusAttackLimit',
								capitalResourcesLooted: '$members.capitalResourcesLooted',
								reward: {
									$sum: [
										{
											$multiply: ['$offensiveReward', '$members.attacks']
										},
										'$defensiveReward'
									]
								}
							}
						}
					}
				}
			])
			.toArray();
		result.sort((a, b) => b.raids.length - a.raids.length);

		const embeds: EmbedBuilder[] = [];
		for (const chunk of Util.chunk(result, 15)) {
			const embed = new EmbedBuilder();
			embed.setColor(this.client.embed(interaction));
			embed.setTitle('Capital Raid History (last 3 months)');

			chunk.forEach((member) => {
				embed.addFields({
					name: `${member.name} (${member.tag})`,
					value: [
						'```',
						'\u200e # LOOTED HITS  WEEKEND',
						member.raids
							.slice(0, 14)
							.map((raid, i) => {
								const looted = this.padding(raid.capitalResourcesLooted);
								const attacks = `${raid.attacks}/${raid.attackLimit + raid.bonusAttackLimit}`.padStart(4, ' ');
								return `\u200e${(i + 1).toString().padStart(2, ' ')} ${looted} ${attacks}  ${moment(raid.weekId)
									.format('D MMM')
									.padStart(6, ' ')}`;
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
				const raids = r.raids.reduce<Record<string, IRaid>>((prev, acc) => {
					prev[acc.weekId] ??= acc; // eslint-disable-line
					return prev;
				}, {});
				return { name: r.name, tag: r.tag, raids };
			})
			.flat();

		const weekendIds = Util.getWeekIds(14);
		const sheets: CreateGoogleSheet[] = [
			{
				title: `Capital Raid History`,
				columns: [
					{ name: 'NAME', align: 'LEFT', width: 160 },
					{ name: 'TAG', align: 'LEFT', width: 160 },
					...weekendIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
				],
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				rows: chunks.map((r) => [r.name, r.tag, ...weekendIds.map((id) => r.raids[id]?.attacks ?? 0)])
			},
			{
				title: `Capital Loot History`,
				columns: [
					{ name: 'NAME', align: 'LEFT', width: 160 },
					{ name: 'TAG', align: 'LEFT', width: 160 },
					...weekendIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
				],
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				rows: chunks.map((r) => [r.name, r.tag, ...weekendIds.map((id) => r.raids[id]?.capitalResourcesLooted ?? 0)])
			},
			{
				title: `Capital Medals History`,
				columns: [
					{ name: 'NAME', align: 'LEFT', width: 160 },
					{ name: 'TAG', align: 'LEFT', width: 160 },
					...weekendIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
				],
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				rows: chunks.map((r) => [r.name, r.tag, ...weekendIds.map((id) => r.raids[id]?.reward ?? 0)])
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Capital Raid History]`, sheets);
		return interaction.editReply({ components: getExportComponents(spreadsheet) });
	}

	private padding(num: number) {
		return num.toString().padStart(6, ' ');
	}
}

interface IRaid {
	weekId: string;
	clan: {
		name: string;
		tag: string;
	};
	name: string;
	tag: string;
	attacks: number;
	attackLimit: number;
	bonusAttackLimit: number;
	capitalResourcesLooted: number;
	reward: number;
}

interface AggregatedResult {
	name: string;
	tag: string;
	raids: IRaid[];
}
