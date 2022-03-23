import { Collections, Messages } from '../../util/Constants';
import { Command } from '../../lib';
import Excel from '../../struct/Excel';
import { CommandInteraction } from 'discord.js';
import ms from 'ms';

// TODO: Fix TS
export default class LastWarsExport extends Command {
	public constructor() {
		super('export-last-wars', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction, args: { wars?: number }) {
		let num = Number(args.wars ?? 25);
		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild!.id }).toArray();

		if (!clans.length) {
			return interaction.editReply(Messages.SERVER.NO_CLANS_LINKED);
		}

		num = this.client.patrons.get(interaction.guild!.id) ? Math.min(num, 45) : Math.min(25, num);
		const clanList = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		const memberList = clanList.map((clan) => clan.memberList.map((m) => ({ ...m, clan: clan.name }))).flat();

		const workbook = new Excel();
		const sheet = workbook.addWorksheet('Details');
		const members = [] as { name: string; tag: string; total: number; clan: string; date: Date }[];
		for (const clan of clans) {
			const data = await this.client.db
				.collection(Collections.CLAN_WARS)
				.aggregate<{ name: string; tag: string; total: number; clan: string; date: Date }>([
					{
						$match: {
							$or: [{ 'clan.tag': clan.tag }, { 'opponent.tag': clan.tag }],
							state: 'warEnded'
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
		] as any;

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		sheet.addRows(
			members
				.filter((mem) => memberList.find((m) => m.tag === mem.tag))
				.map((m) => [m.name, m.tag, m.clan, m.total, m.date, ms(Date.now() - m.date.getTime())])
				.concat(memberList.filter((mem) => !members.find((m) => m.tag === mem.tag)).map((mem) => [mem.name, mem.tag, mem.clan, 0]))
		);

		const buffer = await workbook.xlsx.writeBuffer();
		return interaction.editReply({
			content: `**Last Played Wars (Last ${num})**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'last_played_wars.xlsx'
				}
			]
		});
	}
}
