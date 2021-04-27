import { Season, Collections } from '@clashperk/node';
import { Command } from 'discord-akairo';
import Excel from '../../struct/Excel';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

// TODO: Fix TS
export default class ExportSeason extends Command {
	public constructor() {
		super('export-season', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {},
			optionFlags: ['--season']
		});
	}

	public *args(msg: Message): unknown {
		const season = yield {
			flag: '--season',
			type: [
				Season.ID,
				...Array(3).fill('').map((_, i) => {
					const now = new Date(Season.ID);
					now.setHours(0, 0, 0, 0);
					now.setMonth(now.getMonth() - i, 0);
					return Season.generateID(now);
				})
			],
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { season };
	}

	public async exec(message: Message, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		if (!clans.length) {
			return message.util!.send(`**No clans are linked to ${message.guild!.name}**`);
		}

		const workbook = new Excel();
		const sheet = workbook.addWorksheet(season);
		const patron = this.client.patrons.get(message.guild!.id);

		const _clans: Clan[] = (await Promise.all(clans.map(clan => this.client.http.clan(clan.tag)))).filter(res => res.ok);
		const allMembers = _clans.map(clan => clan.memberList).flat();

		const memberTags: { tag: string; user: string }[] = [];
		if (patron) {
			memberTags.push(...(await this.client.http.getDiscordLinks(allMembers)));
			const dbMembers = await this.client.db.collection(Collections.LINKED_PLAYERS)
				.find({ 'entries.tag': { $in: allMembers.map(m => m.tag) } })
				.toArray();
			if (dbMembers.length) this.updateUsers(message, dbMembers);
			for (const member of dbMembers) {
				for (const m of member.entries) {
					if (!allMembers.find(mem => mem.tag === m.tag)) continue;
					if (memberTags.find(mem => mem.tag === m.tag)) continue;
					memberTags.push({ tag: m.tag, user: member.user });
				}
			}
			await message.guild!.members.fetch({ user: memberTags.map(m => m.user) });
		}

		const members = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.find({ tag: { $in: allMembers.map(m => m.tag) }, clanTag: { $in: _clans.map(clan => clan.tag) }, season })
			.sort({ createdAt: -1 })
			.toArray();

		let count = 0;
		for (const clan of _clans) {
			if (clan.members === 0) continue;
			const lastseen = await this.aggregationQuery(clan);

			count += members.length;
			for (const mem of members) {
				mem.activity_total = lastseen.find(m => m.tag === mem.tag)?.count ?? 0;
				const user = memberTags.find(user => user.tag === mem.tag)?.user;
				mem.user_tag = message.guild!.members.cache.get(user!)?.user.tag;
			}

			const columns = [
				{ header: 'Name', width: 20 },
				{ header: 'Tag', width: 16 },
				{ header: 'Discord', width: 16 },
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
			];

			if (!patron) columns.splice(2, 1);

			sheet.columns = [...columns] as any[];
			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			const achievements = ['War League Legend', 'Gold Grab', 'Elixir Escapade', 'Heroic Heist', 'Games Champion'];
			sheet.addRows(
				members.map(m => {
					const rows = [
						m.name,
						m.tag,
						m.user_tag,
						clan.name,
						m.townHallLevel,
						m.donations.gained,
						m.donationsReceived.gained,
						m.attackWins,
						m.versusBattleWins.gained,
						m.trophies.gained,
						m.versusTrophies.gained,
						m.warStars.gained,
						...achievements.map(ac => m.achievements.find((a: any) => a.name === ac).gained),
						m.activity_total
					];

					if (!patron) rows.splice(2, 1);
					return rows;
				})
			);
		}

		if (!count) {
			return message.util!.send(`**No record found for the specified season ID \`${season}\`**`);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return message.util!.send(`**Season Export (${season})**`, {
			files: [{
				attachment: Buffer.from(buffer),
				name: 'season_export.xlsx'
			}]
		});
	}

	private async aggregationQuery(clan: Clan): Promise<{ tag: string; count: number }[]> {
		const db = this.client.db.collection(Collections.LAST_SEEN);
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

		return (await cursor.next())?.members ?? [];
	}

	private updateUsers(message: Message, members: any[]) {
		for (const data of members) {
			const member = message.guild!.members.cache.get(data.user);
			if (member && data.user_tag !== member.user.tag) {
				this.client.resolver.updateUserTag(message.guild!, data.user);
			}
		}
	}
}
