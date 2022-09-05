import { CommandInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';
import { WHITE_NUMBERS, EMOJIS } from '../../util/Emojis.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';
import Workbook from '../../struct/Excel.js';

export default class SummaryClansCommand extends Command {
	public constructor() {
		super('summary-clans', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const clans = await this.client.db
			.collection<{ name: string; tag: string }>(Collections.CLAN_STORES)
			.find({ guild: interaction.guild.id })
			.toArray();

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const embeds = [];
		const OBJ: { [key: string]: { name: string; value: number; key: string }[] } = {
			DONATED: [],
			ATTACKS: [],
			WARS_WON: [],
			WARS_LOST: [],
			AVG_ACTIVITY: [],
			ACTIVE_MEMBERS: []
		};

		const collection: any[] = [];
		for (const clan of clans) {
			const wars = await this.getWars(clan.tag, season);
			const action = await this.getActivity(clan.tag);
			const season_stats = await this.getSeason(clan.tag, season);

			const won = wars.filter((war) => war.result).length;
			const lost = wars.filter((war) => !war.result).length;

			collection.push({
				won,
				lost,
				avg_online: action?.avg_online,
				avg_total: action?.avg_total,
				name: clan.name,
				attackWins: season_stats?.attackWins,
				tag: clan.tag,
				wars: wars.length,
				donations: season_stats?.donations,
				donationsReceived: season_stats?.donationsReceived,
				defenseWins: season_stats?.defenseWins
			});

			if (!action || !season_stats) continue;

			OBJ.WARS_WON.push({ name: clan.name, value: won, key: `${EMOJIS.CROSS_SWORD} Wars Won` });
			OBJ.WARS_LOST.push({ name: clan.name, value: lost, key: `${EMOJIS.EMPTY_SWORD} Wars Lost` });
			OBJ.DONATED.push({ name: clan.name, value: season_stats.donations, key: `${EMOJIS.TROOPS_DONATE} Troops Donated` });
			OBJ.ATTACKS.push({ name: clan.name, value: season_stats.attackWins, key: `${EMOJIS.SWORD} Attacks Won` });
			OBJ.AVG_ACTIVITY.push({ name: clan.name, value: Math.floor(action.avg_total), key: `${EMOJIS.ACTIVITY} Avg. Activity` });
			OBJ.ACTIVE_MEMBERS.push({ name: clan.name, value: Math.floor(action.avg_online), key: `${EMOJIS.USER_BLUE} Active Members` });
		}

		if (!OBJ.DONATED.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		// Array(3).fill(0).map(() => [].splice(0, 2))
		const fields = Object.values(OBJ);
		const embed = new EmbedBuilder();
		for (const stats of fields) {
			stats.sort((a, b) => b.value - a.value);
			const pad = stats[0].value.toLocaleString().length + 1;

			embed.addFields([
				{
					name: stats[0].key,
					value: [
						stats
							.slice(0, 15)
							.map((en, i) => {
								const num = en.value.toLocaleString().padStart(pad, ' ');
								return `${WHITE_NUMBERS[++i]} \`\u200e${num} \u200f\` \u200e\`${en.name.padEnd(15, ' ')}\u200f\``;
							})
							.join('\n')
					].join('\n')
				}
			]);
		}
		embeds.push(embed);

		const customId = this.client.uuid();
		const button = new ButtonBuilder().setCustomId(customId).setStyle(ButtonStyle.Secondary).setLabel('Download');
		const msg = await interaction.editReply({ embeds, components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });

		const collector = msg.createMessageComponentCollector({
			filter: (action) => action.customId === customId,
			max: 1,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customId) {
				await action.deferReply();
				const buffer = await this.getBuffer(collection);

				await action.followUp({
					files: [
						{
							attachment: Buffer.from(buffer),
							name: 'clan_stats.xlsx'
						}
					]
				});
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customId);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private async getWars(tag: string, season: string): Promise<{ result: boolean; stars: number[] }[]> {
		return this.client.db
			.collection(Collections.CLAN_WARS)
			.aggregate<{ result: boolean; stars: number[] }>([
				{
					$match: {
						$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
						state: 'warEnded',
						season
					}
				},
				{
					$project: {
						result: {
							$switch: {
								branches: [
									{
										case: { $gt: ['$clan.stars', '$opponent.stars'] },
										then: true
									},
									{
										case: { $gt: ['$clan.destructionPercentage', '$opponent.destructionPercentage'] },
										then: true
									}
								],
								default: false
							}
						},
						stars: '$clan.members.attacks.stars'
					}
				}
			])
			.toArray();
	}

	private async getActivity(tag: string): Promise<{ avg_total: number; avg_online: number } | null> {
		return this.client.db
			.collection(Collections.LAST_SEEN)
			.aggregate<{ avg_total: number; avg_online: number }>([
				{
					$match: {
						'clan.tag': tag
					}
				},
				{
					$sort: {
						lastSeen: -1
					}
				},
				{
					$limit: 50
				},
				{
					$unwind: {
						path: '$entries'
					}
				},
				{
					$group: {
						_id: {
							date: {
								$dateToString: {
									date: '$entries.entry',
									format: '%Y-%m-%d'
								}
							},
							tag: '$tag'
						},
						count: {
							$sum: '$entries.count'
						}
					}
				},
				{
					$group: {
						_id: '$_id.date',
						online: {
							$sum: 1
						},
						total: {
							$sum: '$count'
						}
					}
				},
				{
					$group: {
						_id: null,
						avg_online: {
							$avg: '$online'
						},
						avg_total: {
							$avg: '$total'
						}
					}
				}
			])
			.next();
	}

	private async getSeason(tag: string, season: string) {
		return this.client.db
			.collection(Collections.PLAYER_SEASONS)
			.aggregate([
				{
					$match: { __clans: tag, season }
				},
				{
					$project: {
						attackWins: 1,
						defenseWins: 1,
						donations: `$clans.${tag}.donations.total`,
						donationsReceived: `$clans.${tag}.donationsReceived.total`
					}
				},
				{ $sort: { donations: -1 } },
				{ $limit: 50 },
				{
					$group: {
						_id: null,
						donations: { $sum: '$donations' },
						donationsReceived: { $sum: '$donationsReceived' },
						attackWins: { $sum: '$attackWins' },
						defenseWins: { $sum: '$defenseWins' }
					}
				}
			])
			.next();
	}

	private async getBuffer(collection: any[] = []) {
		const workbook = new Workbook();
		const sheet = workbook.addWorksheet('Clan Stats');
		sheet.columns = [
			{ header: 'Name', width: 16 },
			{ header: 'Tag', width: 16 },
			{ header: 'Wars', width: 10 },
			{ header: 'Won', width: 10 },
			{ header: 'Lost', width: 10 },
			{ header: 'Donations', width: 10 },
			{ header: 'Receives', width: 10 },
			{ header: 'Attacks', width: 10 },
			{ header: 'Defenses', width: 10 },
			{ header: 'Avg. Activity', width: 10 },
			{ header: 'Avg. Active Members', width: 16 }
		];

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		sheet.addRows(
			collection.map((m) => [
				m.name,
				m.tag,
				m.wars,
				m.won,
				m.lost,
				m.donations,
				m.donationsReceived,
				m.attackWins,
				m.defenseWins,
				Math.floor(m.avg_total ?? 0),
				Math.floor(m.avg_online ?? 0)
			])
		);

		return workbook.xlsx.writeBuffer();
	}
}
