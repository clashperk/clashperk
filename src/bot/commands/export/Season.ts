import { COLLECTIONS } from '../../util/Constants';
import { Command } from 'discord-akairo';
import Excel from '../../struct/Excel';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

// TODO: Fix TS
export default class WarExport extends Command {
	public constructor() {
		super('export-season', {
			category: 'activity',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: 'Export season stats to excel for all clans.',
				examples: ['']
			}
		});
	}

	private get season() {
		return new Date().toISOString().substring(0, 7);
	}

	public async exec(message: Message) {
		const clans = await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		const workbook = new Excel();
		const sheet = workbook.addWorksheet(new Date().toISOString().substring(0, 7));

		for (const { tag, name } of clans) {
			const clan: Clan = await this.client.http.clan(tag);
			if (!clan.ok) continue;
			if (clan.members === 0) continue;
			const lastseen = await this.aggregationQuery(clan);

			const members = await this.client.db.collection(COLLECTIONS.CLAN_MEMBERS)
				.find({ tag: { $in: clan.memberList.map(m => m.tag) }, clanTag: clan.tag, season: this.season })
				.sort({ createdAt: -1 })
				.toArray();

			for (const mem of members) mem.totalActivity = lastseen.find(m => m.tag === mem.tag)?.count ?? 0;

			// const sheet = workbook.addWorksheet(name);
			sheet.columns = [
				{ header: 'Name', width: 20 },
				{ header: 'Tag', width: 16 },
				{ header: 'Clan', width: 20 },
				{ header: 'Town Hall', width: 10 },
				{ header: 'Total Donated', width: 10 },
				{ header: 'Total Received', width: 10 },
				{ header: 'Total Attacks', width: 10 },
				{ header: 'Versus Attacks', width: 10 },
				{ header: 'Trophies Gained', width: 10 },
				{ header: 'Versus Trophies', width: 10 },
				{ header: 'WarStars Gained', width: 10 },
				{ header: 'CWL Stars Gained', width: 10 },
				{ header: 'Gold Grab', width: 10 },
				{ header: 'Elixir Escapade', width: 10 },
				{ header: 'Heroic Heist', width: 10 },
				{ header: 'Clan Games', width: 10 },
				{ header: 'Total Activity', width: 10 }
			] as any[];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(
				members.map(m => [
					m.name,
					m.tag,
					name,
					m.townHallLevel,
					m.donations.gained,
					m.donationsReceived.gained,
					m.attackWins,
					m.versusBattleWins.gained,
					m.trophies.gained,
					m.versusTrophies.gained,
					m.warStars.gained,
					...['War League Legend', 'Gold Grab', 'Elixir Escapade', 'Heroic Heist', 'Games Champion']
						.map(ac => m.achievements.find((a: any) => a.name === ac).gained),
					m.totalActivity
				])
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return message.util!.send('**Season Export**', {
			files: [{
				attachment: Buffer.from(buffer),
				name: 'season_export.xlsx'
			}]
		});
	}

	private async aggregationQuery(clan: Clan): Promise<{ tag: string; count: number }[]> {
		const db = this.client.db.collection(COLLECTIONS.LAST_ONLINES);
		const cursor = db.aggregate([
			{
				$match: {
					'clan.tag': clan.tag,
					'tag': { $in: [...clan.memberList.map(m => m.tag)] }
				}
			},
			{
				$project: {
					tag: '$tag',
					clan: '$clan',
					entries: {
						$filter: {
							input: '$entries',
							as: 'en',
							cond: {
								$gte: [
									'$$en.entry', new Date(new Date().getTime() - (30 * 24 * 60 * 60 * 1000))
								]
							}
						}
					}
				}
			},
			{
				$project: {
					tag: '$tag',
					clan: '$clan',
					count: {
						$sum: '$entries.count'
					}
				}
			},
			{
				$group: {
					_id: null,
					members: {
						$addToSet: {
							count: '$count',
							tag: '$tag'
						}
					}
				}
			}
		]);

		return (await cursor.toArray())[0]?.members ?? [];
	}
}