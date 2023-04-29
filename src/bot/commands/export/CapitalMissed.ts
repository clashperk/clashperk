import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from 'discord.js';
import { sheets_v4 } from 'googleapis';
import { Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';
import Google from '../../struct/Google.js';
import { ClanCapitalRaidAttackData } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

export default class ExportCapitalMissed extends Command {
	public constructor() {
		super('export-capital-missed', {
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

			const membersMap: Record<
				string,
				{
					name: string;
					tag: string;
					capitalResourcesLooted: number;
					attackLimit: number;
					attacks: number;
					bonusAttackLimit: number;
					attacksMissed: number;
					participation: number;
					weekends: number;
				}
			> = {};
			for (const clan of weekends.reverse()) {
				for (const member of clan.members) {
					// eslint-disable-next-line
					membersMap[member.tag] ??= {
						name: member.name,
						tag: member.tag,
						capitalResourcesLooted: 0,
						attackLimit: 0,
						attacks: 0,
						bonusAttackLimit: 0,
						attacksMissed: 0,
						participation: 0,
						weekends: weekends.length
					};

					const mem = membersMap[member.tag];
					mem.capitalResourcesLooted += member.capitalResourcesLooted;
					mem.attackLimit += member.attackLimit;
					mem.attacks += member.attacks;
					mem.bonusAttackLimit += member.bonusAttackLimit;
					mem.attacksMissed += member.attackLimit + member.bonusAttackLimit - member.attacks;
					mem.participation += 1;
				}
			}

			chunks.push({
				name,
				tag,
				members: Object.values(membersMap).sort((a, b) => b.attacksMissed - a.attacksMissed)
			});
		}
		if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const columns = [
			{ header: 'Name', width: 20 },
			{ header: 'Tag', width: 20 },
			{ header: 'Total Loot', width: 10 },
			{ header: 'Attack Limit', width: 10 },
			{ header: 'Bonus Attack Limit', width: 10 },
			{ header: 'Attacks Used', width: 10 },
			{ header: 'Attacks Missed', width: 10 },
			{ header: 'Participation', width: 10 },
			{ header: 'Weekends', width: 10 }
		];
		const workbook = new Excel();
		for (const { name, tag, members } of chunks) {
			const sheet = workbook.addWorksheet(Util.escapeSheetName(`${name} (${tag})`));
			sheet.columns = columns;

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(
				members.map((mem) => [
					mem.name,
					mem.tag,
					mem.capitalResourcesLooted,
					mem.attackLimit,
					mem.bonusAttackLimit,
					mem.attacks,
					mem.attacksMissed,
					mem.participation,
					mem.weekends
				])
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		await interaction.editReply({
			content: `**Clan Capital Raids**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'clan_capital_raids.xlsx'
				}
			]
		});

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
							rowCount: Math.max(chunk.members.length + 1, 50),
							columnCount: Math.max(columns.length, 25),
							frozenRowCount: chunk.members.length ? 1 : 0
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

		const requests: sheets_v4.Schema$Request[] = chunks.map((clan, i) => ({
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
								stringValue: value.header
							},
							userEnteredFormat: {
								wrapStrategy: 'WRAP'
							}
						}))
					},
					...clan.members.map((mem) => ({
						values: [
							mem.name,
							mem.tag,
							mem.capitalResourcesLooted,
							mem.attackLimit,
							mem.bonusAttackLimit,
							mem.attacks,
							mem.attacksMissed,
							mem.participation,
							mem.weekends
						].map((value, i) => ({
							userEnteredValue: typeof value === 'string' ? { stringValue: value.toString() } : { numberValue: value },
							userEnteredFormat: {
								textFormat:
									typeof value === 'number' && value > 0 && i === 6
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
