import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';
import Excel from '../../struct/Excel';
import { Message } from 'discord.js';

// TODO: Fix TS
export default class LastWarsExport extends Command {
	public constructor() {
		super('export-last-wars', {
			category: 'export',
			channel: 'guild',
			description: {},
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS']
		});
	}

	public async exec(message: Message) {
		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		if (!clans.length) {
			return message.util!.send(`**No clans are linked to ${message.guild!.name}**`);
		}

		const clanList = (await Promise.all(clans.map(clan => this.client.http.clan(clan.tag)))).filter(res => res.ok);
		const memberList = clanList.map(clan => clan.memberList).flat();

		const workbook = new Excel();
		const sheet = workbook.addWorksheet('Last War Dates');
		const members = await this.client.db.collection(Collections.CLAN_WARS)
			.aggregate([
				{
					$match: {
						'state': 'warEnded', 'groupWar': false,
						'clan.tag': { $in: clanList.map(clan => clan.tag) }
					}
				}, {
					$project: {
						member: '$clan.members',
						date: '$endTime'
					}
				}, {
					$unwind: {
						path: '$member'
					}
				}, {
					$sort: {
						date: -1
					}
				}, {
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
						}
					}
				}, {
					$sort: {
						date: -1
					}
				}
			]).toArray();

		sheet.columns = [
			{ header: 'Name', width: 20 },
			{ header: 'Tag', width: 16 },
			{ header: 'Total Wars', width: 10 },
			{ header: 'Last War', width: 16 }
		] as any;

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		sheet.addRows(
			members.filter(
				mem => memberList.find(m => m.tag === mem.tag)
			).map(
				m => [m.name, m.tag, m.total, m.date]
			).concat(
				memberList.filter(mem => !members.find(m => m.tag === mem.tag)).map(mem => [mem.name, mem.tag, 0])
			)
		);

		const buffer = await workbook.xlsx.writeBuffer();
		return message.util!.send({
			content: `**Last Played Wars**`,
			files: [{
				attachment: Buffer.from(buffer),
				name: 'last_played_wars.xlsx'
			}]
		});
	}
}

