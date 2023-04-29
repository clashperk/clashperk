import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from 'discord.js';
import { sheets_v4 } from 'googleapis';
import { Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';
import Google from '../../struct/Google.js';
import { ClanCapitalRaidAttackData } from '../../types/index.js';
import { Collections, UnrankedCapitalLeagueId } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

export default class ExportCapital extends Command {
	public constructor() {
		super('export-capital', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { limit?: number; clans?: string; season?: string }) {
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

		const chunks = [];
		for (const { tag, name } of clans) {
			const weekends = await this.client.db
				.collection<ClanCapitalRaidAttackData>(Collections.CAPITAL_RAID_SEASONS)
				.find({ tag })
				.sort({ _id: -1 })
				.limit(10)
				.toArray();

			const _weekends = [];
			for (const clan of weekends) {
				const remark =
					clan.capitalLeague && clan._capitalLeague
						? clan._capitalLeague.id > clan.capitalLeague.id
							? 'Promoted'
							: clan._capitalLeague.id === clan.capitalLeague.id
							? 'Stayed'
							: 'Demoted'
						: 'Unknown';
				const trophyGained = (clan._clanCapitalPoints ?? 0) - (clan.clanCapitalPoints ?? 0);

				_weekends.push({
					name: clan.name,
					tag: clan.tag,
					status: remark,
					weekId: clan.weekId,
					leagueId: clan.capitalLeague?.id ?? UnrankedCapitalLeagueId,
					leagueName: (clan.capitalLeague?.name ?? 'Unknown').replace(/League/g, '').trim(),
					capitalTotalLoot: clan.capitalTotalLoot,
					totalAttacks: clan.totalAttacks,
					raidsCompleted: clan.raidsCompleted,
					defensiveReward: clan.defensiveReward,
					offensiveReward: clan.offensiveReward,
					trophyGained: trophyGained,
					avgLoot: Number((clan.capitalTotalLoot / clan.totalAttacks).toFixed(2))
				});
			}

			chunks.push({
				name,
				tag,
				weekends: _weekends
			});
		}
		if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const workbook = new Excel();
		for (const { name, tag, weekends } of chunks) {
			const sheet = workbook.addWorksheet(Util.escapeSheetName(`${name} (${tag})`));
			sheet.columns = [
				{ header: 'Weekend', width: 20 },
				{ header: 'League', width: 20 },
				{ header: 'Total Loot', width: 10 },
				{ header: 'Avg. Loot', width: 10 },
				{ header: 'Total Attacks', width: 10 },
				{ header: 'Raids Completed', width: 10 },
				{ header: 'Offensive Reward', width: 10 },
				{ header: 'Defensive Reward', width: 10 },
				{ header: 'Trophy Gained', width: 10 },
				{ header: 'Remark', width: 10 }
			];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(
				weekends.map((weekend) => [
					weekend.weekId,
					weekend.leagueName.replace(/League/g, '').trim(),
					weekend.capitalTotalLoot,
					weekend.avgLoot,
					weekend.totalAttacks,
					weekend.raidsCompleted,
					weekend.offensiveReward,
					weekend.defensiveReward,
					Number(weekend.trophyGained),
					weekend.status
				])
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		await interaction.editReply({
			content: `**Clan Capital Export**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'clan_capital_stats.xlsx'
				}
			]
		});

		const columns = [
			'Weekend',
			'League',
			'Total Loot',
			'Avg. Loot',
			'Total Attacks',
			'Raids Completed',
			'Offensive Reward',
			'Defensive Reward',
			'Trophy Gained',
			'Remark'
		];

		const sheet = Google.sheet();
		const drive = Google.drive();
		const spreadsheet = await sheet.spreadsheets.create({
			requestBody: {
				properties: {
					title: `${interaction.guild.name} [Clan Capital Stats]`
				},
				sheets: chunks.map((chunk, i) => ({
					properties: {
						sheetId: i,
						index: i,
						title: Util.escapeSheetName(`${chunk.name} (${chunk.tag})`),
						gridProperties: {
							rowCount: Math.max(chunk.weekends.length + 1, 50),
							columnCount: Math.max(columns.length, 25),
							frozenRowCount: chunk.weekends.length ? 1 : 0
						}
					}
				}))
			},
			fields: 'spreadsheetId,spreadsheetUrl'
		});

		await Promise.all([
			drive.permissions.create({
				requestBody: {
					role: 'reader',
					type: 'anyone'
				},
				fileId: spreadsheet.data.spreadsheetId!
			}),
			drive.revisions.update({
				requestBody: {
					published: true,
					publishedOutsideDomain: true,
					publishAuto: true
				},
				fileId: spreadsheet.data.spreadsheetId!,
				revisionId: '1',
				fields: '*'
			})
		]);

		const requests: sheets_v4.Schema$Request[] = chunks.map((c, i) => ({
			updateCells: {
				start: {
					sheetId: i,
					rowIndex: 0,
					columnIndex: 0
				},
				rows: [
					{
						values: columns.map((value) => ({
							userEnteredValue: {
								stringValue: value
							},
							userEnteredFormat: {
								wrapStrategy: 'WRAP'
							}
						}))
					},
					...c.weekends.map((weekend) => ({
						values: [
							weekend.weekId,
							weekend.leagueName,
							weekend.capitalTotalLoot,
							weekend.avgLoot,
							weekend.totalAttacks,
							weekend.raidsCompleted,
							weekend.offensiveReward,
							weekend.defensiveReward,
							weekend.trophyGained,
							weekend.status
						].map((value) => ({
							userEnteredValue: typeof value === 'string' ? { stringValue: value.toString() } : { numberValue: value },
							userEnteredFormat: {
								textFormat:
									value === 'Demoted' || (typeof value === 'number' && value <= 0)
										? { foregroundColorStyle: { rgbColor: { red: 1 } } }
										: {}
							}
						}))
					}))
				],
				fields: '*'
			}
		})) as sheets_v4.Schema$Request[];

		const styleRequests: sheets_v4.Schema$Request[] = chunks
			.map((_, i) => [
				{
					repeatCell: {
						range: {
							sheetId: i,
							startRowIndex: 0,
							startColumnIndex: 0,
							endColumnIndex: 2
						},
						cell: {
							userEnteredFormat: {
								horizontalAlignment: 'LEFT'
							}
						},
						fields: 'userEnteredFormat(horizontalAlignment)'
					}
				},
				{
					repeatCell: {
						range: {
							sheetId: i,
							startRowIndex: 0,
							startColumnIndex: 2
						},
						cell: {
							userEnteredFormat: {
								horizontalAlignment: 'RIGHT'
							}
						},
						fields: 'userEnteredFormat(horizontalAlignment)'
					}
				},
				{
					repeatCell: {
						range: {
							sheetId: i,
							startRowIndex: 0,
							endRowIndex: 1,
							startColumnIndex: 0
						},
						cell: {
							userEnteredFormat: {
								textFormat: { bold: true },
								verticalAlignment: 'MIDDLE'
							}
						},
						fields: 'userEnteredFormat(textFormat,verticalAlignment)'
					}
				}
				// {
				// 	updateDimensionProperties: {
				// 		range: {
				// 			sheetId: 0,
				// 			dimension: 'COLUMNS',
				// 			startIndex: 0,
				// 			endIndex: columns.length
				// 		},
				// 		properties: {
				// 			pixelSize: 120
				// 		},
				// 		fields: 'pixelSize'
				// 	}
				// }
			])
			.flat();

		await sheet.spreadsheets.batchUpdate({
			spreadsheetId: spreadsheet.data.spreadsheetId!,
			requestBody: {
				requests: [...requests, ...styleRequests]
			}
		});

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Google Sheet').setURL(spreadsheet.data.spreadsheetUrl!),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel('Open in Web')
				.setURL(spreadsheet.data.spreadsheetUrl!.replace('edit', 'pubhtml'))
		);

		const downloadRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel('Download')
				.setURL(`https://docs.google.com/spreadsheets/export?id=${spreadsheet.data.spreadsheetId!}&exportFormat=xlsx`),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel('Download PDF')
				.setURL(`https://docs.google.com/spreadsheets/export?id=${spreadsheet.data.spreadsheetId!}&exportFormat=pdf`)
		);
		return interaction.editReply({ components: [row, downloadRow] });
	}
}
