import { CommandInteraction } from 'discord.js';
import { sheets_v4 } from 'googleapis';
import ms from 'ms';
import { Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';
import Google from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';
import { Util } from '../../util/index.js';

export default class LastWarsExport extends Command {
	public constructor() {
		super('export-last-wars', {
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

		let num = Number(args.limit ?? 25);
		num = Math.min(100, num);
		const clanList = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		const memberList = clanList.map((clan) => clan.memberList.map((m) => ({ ...m, clan: clan.name }))).flat();

		const columns = [
			{ header: 'Name', width: 20 },
			{ header: 'Tag', width: 16 },
			{ header: 'Clan', width: 16 },
			{ header: 'Total Wars', width: 10 },
			{ header: 'Last War Date', width: 16 },
			{ header: 'Duration', width: 16 }
		];

		const workbook = new Excel();
		const query = args.season ? { season: args.season } : {};
		const sheet = workbook.addWorksheet('Details');
		const members = [] as { name: string; tag: string; total: number; clan: string; date: Date }[];
		for (const clan of clans) {
			const data = await this.client.db
				.collection(Collections.CLAN_WARS)
				.aggregate<{ name: string; tag: string; total: number; clan: string; date: Date }>([
					{
						$match: {
							$or: [{ 'clan.tag': clan.tag }, { 'opponent.tag': clan.tag }],
							state: 'warEnded',
							...query
						}
					},
					{
						$sort: {
							_id: -1
						}
					},
					{
						$limit: num
					},
					{
						$set: {
							clan: {
								$cond: [{ $eq: ['$clan.tag', clan.tag] }, '$clan', '$opponent']
							}
						}
					},
					{
						$project: {
							member: '$clan.members',
							clan: '$clan.name',
							date: '$endTime'
						}
					},
					{
						$unwind: {
							path: '$member'
						}
					},
					{
						$sort: {
							date: -1
						}
					},
					{
						$group: {
							_id: '$member.tag',
							name: {
								$first: '$member.name'
							},
							tag: {
								$first: '$member.tag'
							},
							date: {
								$first: '$date'
							},
							total: {
								$sum: 1
							},
							clan: {
								$first: '$clan'
							}
						}
					},
					{
						$sort: {
							date: -1
						}
					}
				])
				.toArray();

			members.push(...data);
		}

		sheet.columns = [
			{ header: 'Name', width: 20 },
			{ header: 'Tag', width: 16 },
			{ header: 'Clan', width: 16 },
			{ header: 'Total Wars', width: 10 },
			{ header: 'Last War Date', width: 16 },
			{ header: 'Duration', width: 16 }
		];

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		const _missing = memberList
			.filter((mem) => !members.find((m) => m.tag === mem.tag))
			.map((m) => ({
				name: m.name,
				tag: m.tag,
				clan: m.clan,
				total: 0
			}));

		const _members = members
			.filter((mem) => memberList.find((m) => m.tag === mem.tag))
			.map((m) => ({
				name: m.name,
				tag: m.tag,
				clan: m.clan,
				total: m.total,
				date: m.date,
				duration: ms(Date.now() - m.date.getTime())
			}))
			.concat();

		const rows: {
			name: string;
			tag: string;
			clan: string;
			total: number;
			date?: Date;
			duration?: string;
		}[] = [..._members, ..._missing];

		const chunks = rows.map((m) => [m.name, m.tag, m.clan, m.total, m.date ? Util.dateToSerialDate(m.date) : '', m.duration ?? '']);
		sheet.addRows(rows.map((m) => [m.name, m.tag, m.clan, m.total, m.date, m.duration]));

		const buffer = await workbook.xlsx.writeBuffer();
		await interaction.editReply({
			content: `**Last Played Wars (Last ${num})**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'last_played_wars.xlsx'
				}
			]
		});

		const { spreadsheets } = Google.sheet();
		const spreadsheet = await spreadsheets.create({
			requestBody: {
				properties: {
					title: `${interaction.guild.name} [Last Played War Dates]`
				},
				sheets: [1].map((_, i) => ({
					properties: {
						sheetId: i,
						index: i,
						title: Util.escapeSheetName('Details'),
						gridProperties: {
							rowCount: Math.max(members.length + 1, 50),
							columnCount: Math.max(columns.length, 25),
							frozenRowCount: chunks.length ? 1 : 0
						}
					}
				}))
			},
			fields: 'spreadsheetId,spreadsheetUrl'
		});

		await Google.publish(spreadsheet.data.spreadsheetId!);

		const requests: sheets_v4.Schema$Request[] = [1].map((_, i) => ({
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
					...chunks.map((values) => ({
						values: values.map((value, rowIndex) => ({
							userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: value },
							userEnteredFormat: {
								numberFormat: rowIndex === 4 && typeof value === 'number' ? { type: 'DATE_TIME' } : {},
								textFormat:
									typeof value === 'number' && value <= 0 ? { foregroundColorStyle: { rgbColor: { red: 1 } } } : {}
							}
						}))
					}))
				],
				fields: '*'
			}
		}));

		const styleRequests: sheets_v4.Schema$Request[] = [1]
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

		await spreadsheets.batchUpdate({
			spreadsheetId: spreadsheet.data.spreadsheetId!,
			requestBody: {
				requests: [...requests, ...styleRequests]
			}
		});

		return interaction.editReply({ components: getExportComponents(spreadsheet.data) });
	}
}
