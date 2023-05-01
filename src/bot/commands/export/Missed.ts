import { CommandInteraction } from 'discord.js';
import { sheets_v4 } from 'googleapis';
import { Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';
import Google from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';
import { Util } from '../../util/index.js';

const warTypes: Record<string, string> = {
	1: 'Regular',
	2: 'Friendly',
	3: 'CWL'
};

export default class ExportMissed extends Command {
	public constructor() {
		super('export-missed', {
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
		const chunks = [];
		const missed: { [key: string]: { name: string; tag: string; count: number; missed: Date[] } } = {};

		const query = args.season ? { season: args.season } : {};
		for (const { tag } of clans) {
			const wars = await this.client.db
				.collection(Collections.CLAN_WARS)
				.find({
					$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
					state: 'warEnded',
					...query
				})
				.sort({ _id: -1 })
				.limit(num)
				.toArray();

			for (const war of wars) {
				const clan = war.clan.tag === tag ? war.clan : war.opponent;
				const opponent = war.clan.tag === tag ? war.opponent : war.clan;
				for (const m of clan.members) {
					if (m.attacks?.length === war.attacksPerMember) continue;

					const _mem = missed[m.tag] // eslint-disable-line
						? missed[m.tag]
						: (missed[m.tag] = {
								name: m.name,
								tag: m.tag,
								missed: [] as Date[],
								count: war.attacksPerMember - (m.attacks?.length ?? 0)
						  });
					_mem.missed.push(war.endTime);

					const mem = {
						stars: [] as number[],
						name: m.name,
						warID: war.id,
						tag: m.tag,
						clan: clan.name,
						opponent: opponent.name,
						teamSize: war.teamSize,
						timestamp: new Date(war.endTime),
						missed: war.attacksPerMember - (m.attacks?.length ?? 0),
						warType: warTypes[war.warType]
					};

					if (!m.attacks) {
						mem.stars = [0, 0, 0, 0];
					}

					if (m.attacks?.length === 1) {
						mem.stars = m.attacks
							.map((m: any) => [m.stars, m.destructionPercentage.toFixed(2)])
							.flat()
							.concat(...[0, 0]);
					}

					if (m.attacks?.length === 2) {
						mem.stars = m.attacks.map((m: any) => [m.stars, m.destructionPercentage.toFixed(2)]).flat();
					}

					chunks.push(mem);
				}
			}
		}

		if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const workbook = new Excel();
		const sheet = workbook.addWorksheet('Missed Attacks');
		sheet.columns = [
			{ header: 'Name', width: 16 },
			{ header: 'Tag', width: 16 },
			{ header: 'Clan', width: 16 },
			{ header: 'Enemy Clan', width: 16 },
			{ header: 'War ID', width: 16 },
			{ header: 'Ended', width: 14 },
			{ header: 'War Type', width: 10 },
			{ header: 'Team Size', width: 10 },
			{ header: 'Missed', width: 10 }
		];

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		chunks.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
		sheet.addRows(chunks.map((m) => [m.name, m.tag, m.clan, m.opponent, m.warID, m.timestamp, m.warType, m.teamSize, m.missed]));

		// extra pages
		const twoMissed = Object.values(missed).filter((m) => m.count === 2);
		if (twoMissed.length) {
			const sheet = workbook.addWorksheet('2 Missed Attacks');
			sheet.columns = [
				{ header: 'Name', width: 16 },
				{ header: 'Tag', width: 16 },
				{ header: 'Miss #1', width: 16 },
				{ header: 'Miss #2', width: 16 },
				{ header: 'Miss #3', width: 16 },
				{ header: 'Miss #4', width: 16 },
				{ header: 'Miss #5', width: 16 }
			];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(twoMissed.map((m) => [m.name, m.tag, ...m.missed.slice(0, 5)]));
		}

		const oneMissed = Object.values(missed).filter((m) => m.count === 1);
		if (oneMissed.length) {
			const sheet = workbook.addWorksheet('1 Missed Attacks');
			sheet.columns = [
				{ header: 'Name', width: 16 },
				{ header: 'Tag', width: 16 },
				{ header: 'Miss #1', width: 16 },
				{ header: 'Miss #2', width: 16 },
				{ header: 'Miss #3', width: 16 },
				{ header: 'Miss #4', width: 16 },
				{ header: 'Miss #5', width: 16 }
			];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(oneMissed.map((m) => [m.name, m.tag, ...m.missed.slice(0, 5)]));
		}

		const buffer = await workbook.xlsx.writeBuffer();
		await interaction.editReply({
			content: `**Missed Attacks (Last ${num})**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'clan_war_missed.xlsx'
				}
			]
		});

		const sheets = [
			{
				title: Util.escapeSheetName('Missed Attacks'),
				columns: ['Name', 'Tag', 'Clan', 'Enemy Clan', 'War ID', 'Ended', 'War Type', 'Team Size', 'Missed'],
				rows: chunks.map((m) => [
					m.name,
					m.tag,
					m.clan,
					m.opponent,
					m.warID,
					Util.dateToSerialDate(m.timestamp),
					m.warType,
					m.teamSize,
					m.missed
				])
			},
			{
				title: Util.escapeSheetName(`2 Missed Attacks`),
				columns: ['Name', 'Tag', 'Miss #1', 'Miss #2', 'Miss #3', 'Miss #4', 'Miss #5'],
				rows: twoMissed.map((m) => [m.name, m.tag, ...m.missed.map((m) => Util.dateToSerialDate(m)).slice(0, 5)])
			},
			{
				title: Util.escapeSheetName('1 Missed Attacks'),
				columns: ['Name', 'Tag', 'Miss #1', 'Miss #2', 'Miss #3', 'Miss #4', 'Miss #5'],
				rows: oneMissed.map((m) => [m.name, m.tag, ...m.missed.map((m) => Util.dateToSerialDate(m)).slice(0, 5)])
			}
		];

		const { spreadsheets } = Google.sheet();
		const spreadsheet = await spreadsheets.create({
			requestBody: {
				properties: {
					title: `${interaction.guild.name} [Missed Attacks]`
				},
				sheets: sheets.map((chunk, i) => ({
					properties: {
						sheetId: i,
						index: i,
						title: chunk.title,
						gridProperties: {
							rowCount: Math.max(chunk.rows.length + 1, 100),
							columnCount: Math.max(chunk.columns.length, 50),
							frozenRowCount: chunk.rows.length ? 1 : 0
						}
					}
				}))
			},
			fields: 'spreadsheetId,spreadsheetUrl'
		});

		await Google.publish(spreadsheet.data.spreadsheetId!);

		const requests: sheets_v4.Schema$Request[] = sheets.map((chunk, sheetIndex) => ({
			updateCells: {
				start: {
					sheetId: sheetIndex,
					rowIndex: 0,
					columnIndex: 0
				},
				rows: [
					{
						values: chunk.columns.map((value) => ({
							userEnteredValue: {
								stringValue: value
							},
							userEnteredFormat: {
								wrapStrategy: 'WRAP'
							}
						}))
					},
					...chunk.rows.map((values) => ({
						values: values.map((value, rowIndex) => ({
							userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: value.toString() },
							userEnteredFormat: {
								numberFormat:
									((rowIndex === 5 && sheetIndex === 0) || (rowIndex >= 2 && sheetIndex > 0)) && typeof value === 'number'
										? { type: 'DATE' }
										: {},
								textFormat:
									typeof value === 'number' && value <= 0 ? { foregroundColorStyle: { rgbColor: { red: 1 } } } : {}
							}
						}))
					}))
				],
				fields: '*'
			}
		}));

		const styleRequests: sheets_v4.Schema$Request[] = sheets
			.map((_, i) => [
				{
					repeatCell: {
						range: {
							sheetId: i,
							startRowIndex: 0,
							startColumnIndex: 0,
							endColumnIndex: 4
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
							startColumnIndex: 4
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
				},
				{
					updateDimensionProperties: {
						range: {
							sheetId: i,
							dimension: 'COLUMNS',
							startIndex: 0,
							endIndex: 10
						},
						properties: {
							pixelSize: 120
						},
						fields: 'pixelSize'
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
