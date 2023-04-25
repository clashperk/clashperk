import { ClanWarAttack, WarClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from 'discord.js';
import { sheets_v4 } from 'googleapis';
import { Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';
import Google from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

export enum WarType {
	REGULAR = 1,
	FRIENDLY,
	CWL
}

export default class WarExport extends Command {
	public constructor() {
		super('export-wars', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { limit?: number; clans?: string; season?: string; war_type: string }
	) {
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
		const query = args.season ? { season: args.season } : {};
		const chunks = [];
		for (const { tag, name } of clans) {
			const wars = await this.client.db
				.collection(Collections.CLAN_WARS)
				.find({
					$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
					state: { $in: ['inWar', 'warEnded'] },
					warType: args.war_type === 'friendly' ? WarType.FRIENDLY : WarType.REGULAR,
					...query
				})
				.sort({ _id: -1 })
				.limit(num)
				.toArray();

			const members: { [key: string]: any } = {};
			for (const war of wars) {
				const clan: WarClan = war.clan.tag === tag ? war.clan : war.opponent;
				const attacks = clan.members
					.filter((m) => m.attacks?.length)
					.map((m) => m.attacks!)
					.flat();

				for (const m of clan.members) {
					const member = members[m.tag]
						? members[m.tag]
						: (members[m.tag] = {
								name: m.name,
								tag: m.tag,
								attacks: 0,
								stars: 0,
								newStars: 0,
								dest: 0,
								defStars: 0,
								starTypes: [],
								defCount: 0,
								of: 0,
								defDestruction: 0
						  });
					member.of += war.attacksPerMember;

					for (const atk of m.attacks ?? []) {
						const prev = this.freshAttack(attacks, atk.defenderTag, atk.order)
							? { stars: 0 }
							: this.getPreviousBestAttack(attacks, atk.defenderTag, atk.attackerTag);
						member.newStars += Math.max(0, atk.stars - prev.stars);
					}

					if (m.attacks) {
						member.attacks += m.attacks.length;
						member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
						member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
						member.starTypes.push(...m.attacks.map((atk: any) => atk.stars));
					}

					if (m.bestOpponentAttack) {
						member.defStars += m.bestOpponentAttack.stars;
						member.defDestruction += m.bestOpponentAttack.destructionPercentage;
						member.defCount += 1;
					}
				}
			}

			chunks.push({
				name,
				tag,
				members: Object.values(members)
					.sort((a, b) => b.dest - a.dest)
					.sort((a, b) => b.stars - a.stars)
			});
		}

		if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const workbook = new Excel();
		for (const { name, members, tag } of chunks) {
			const sheet = workbook.addWorksheet(Util.escapeSheetName(`${name} (${tag})`));
			sheet.columns = [
				{ header: 'Name', width: 20 },
				{ header: 'Tag', width: 16 },
				{ header: 'Total Attacks', width: 10 },
				{ header: 'Total Stars', width: 10 },
				{ header: 'True Stars', width: 10 },
				{ header: 'Avg Stars', width: 10 },
				{ header: 'Total Dest', width: 10 },
				{ header: 'Avg Dest', width: 10 },
				{ header: 'Three Stars', width: 10 },
				{ header: 'Two Stars', width: 10 },
				{ header: 'One Stars', width: 10 },
				{ header: 'Zero Stars', width: 10 },
				{ header: 'Missed', width: 10 },
				{ header: 'Def Stars', width: 10 },
				{ header: 'Avg Def Stars', width: 10 },
				{ header: 'Total Def Dest', width: 10 },
				{ header: 'Avg Def Dest', width: 10 }
			];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(
				members
					.filter((m) => m.of > 0)
					.map((m) => [
						m.name,
						m.tag,
						m.of,
						m.stars,
						m.newStars,
						(m.stars / m.of || 0).toFixed(2),
						m.dest.toFixed(2),
						(m.dest / m.of || 0).toFixed(2),
						this.starCount(m.starTypes, 3),
						this.starCount(m.starTypes, 2),
						this.starCount(m.starTypes, 1),
						this.starCount(m.starTypes, 0),
						m.of - m.attacks,
						m.defStars,
						(m.defStars / m.defCount || 0).toFixed(),
						m.defDestruction.toFixed(2),
						(m.defDestruction / m.defCount || 0).toFixed(2)
					])
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		await interaction.editReply({
			content: `**War Export (Last ${num})**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'clan_war_stats.xlsx'
				}
			]
		});

		const columns = [
			'Name',
			'Tag',
			'Total Attacks',
			'Total Stars',
			'True Stars',
			'Avg Stars',
			'Total Dest',
			'Avg Dest',
			'Three Stars',
			'Two Stars',
			'One Stars',
			'Zero Stars',
			'Missed',
			'Def Stars',
			'Avg Def Stars',
			'Total Def Dest',
			'Avg Def Dest'
		];

		const sheet = Google.sheet();
		const drive = Google.drive();
		const spreadsheet = await sheet.spreadsheets.create({
			requestBody: {
				properties: {
					title: `${interaction.guild.name} [Clan War Stats]`
				},
				sheets: chunks.map((chunk, i) => ({
					properties: {
						sheetId: i,
						index: i,
						title: Util.escapeSheetName(`${chunk.name} (${chunk.tag})`),
						gridProperties: {
							rowCount: Math.max(chunk.members.length + 1, 100),
							columnCount: Math.max(columns.length, 50),
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

		const requests: sheets_v4.Schema$Request[] = chunks.map((chunk, i) => ({
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
					...chunk.members
						.filter((m) => m.of > 0)
						.map((m) => ({
							values: [
								m.name,
								m.tag,
								m.of,
								m.stars,
								m.newStars,
								(m.stars / m.of || 0).toFixed(2),
								m.dest.toFixed(2),
								(m.dest / m.of || 0).toFixed(2),
								this.starCount(m.starTypes, 3),
								this.starCount(m.starTypes, 2),
								this.starCount(m.starTypes, 1),
								this.starCount(m.starTypes, 0),
								m.of - m.attacks,
								m.defStars,
								(m.defStars / m.defCount || 0).toFixed(),
								m.defDestruction.toFixed(2),
								(m.defDestruction / m.defCount || 0).toFixed(2)
							].map((value) => ({
								userEnteredValue: {
									stringValue: value.toString()
								},
								userEnteredFormat: {
									textFormat:
										typeof value === 'number' && value <= 0 ? { foregroundColorStyle: { rgbColor: { red: 1 } } } : {}
								}
							}))
						}))
				],
				fields: '*'
			}
		}));

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
				// 			pixelSize: 150
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
			new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Open Google Sheet').setURL(spreadsheet.data.spreadsheetUrl!),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel('Open in Web')
				.setURL(spreadsheet.data.spreadsheetUrl!.replace('edit', 'pubhtml'))
		);
		return interaction.editReply({ components: [row] });
	}

	private starCount(stars: number[] = [], count: number) {
		return stars.filter((star) => star === count).length;
	}

	private getPreviousBestAttack(attacks: ClanWarAttack[], defenderTag: string, attackerTag: string) {
		return attacks
			.filter((atk) => atk.defenderTag === defenderTag && atk.attackerTag !== attackerTag)
			.sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)[0]!;
	}

	private freshAttack(attacks: ClanWarAttack[], defenderTag: string, order: number) {
		const hits = attacks.filter((atk) => atk.defenderTag === defenderTag).sort((a, b) => a.order - b.order);
		return hits.length === 1 || hits[0]!.order === order;
	}
}
