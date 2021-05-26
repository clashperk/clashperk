import { Season, Collections } from '@clashperk/node';
import { Command } from 'discord-akairo';
import Excel from '../../struct/Excel';
import { Clan, ClanMember } from 'clashofclans.js';
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
		const allMembers = _clans.reduce((previous, current) => {
			previous.push(...current.memberList.map(mem => ({ ...mem, clanTag: current.tag })));
			return previous;
		}, [] as (ClanMember & { clanTag: string })[]);

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
			await Promise.all(
				this.chunks(memberTags).map(members => message.guild!.members.fetch({ user: members.map(m => m.user) }))
			);
		}

		const members = (await Promise.all(_clans.map(clan => this.aggregationQuery(clan)))).flat();
		for (const mem of members) {
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
					m.clanName,
					m.townHallLevel,
					m.donations.gained,
					m.donationsReceived.gained,
					m.attackWins,
					m.versusBattleWins.gained,
					m.trophies.gained,
					m.versusTrophies.gained,
					m.warStars.gained,
					...achievements.map(ac => m.achievements.find((a: { name: string }) => a.name === ac).gained),
					m.score
				];

				if (!patron) rows.splice(2, 1);
				return rows;
			})
		);

		if (!members.length) {
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

	private async aggregationQuery(clan: Clan) {
		const cursor = this.client.db.collection(Collections.CLAN_MEMBERS)
			.aggregate([
				{
					$match: {
						clanTag: clan.tag,
						season: Season.ID,
						tag: { $in: clan.memberList.map(m => m.tag) }
					}
				}, {
					$lookup: {
						from: Collections.LAST_SEEN,
						localField: 'tag', foreignField: 'tag', as: 'last_seen'
					}
				}, {
					$unwind: {
						path: '$last_seen'
					}
				}, {
					$set: {
						entries: {
							$filter: {
								input: '$last_seen.entries', as: 'en',
								cond: {
									$gte: [
										'$$en.entry',
										new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
									]
								}
							}
						}
					}
				}, {
					$unset: 'last_seen'
				}, {
					$set: {
						score: {
							$sum: '$entries.count'
						}
					}
				}, {
					$unset: 'entries'
				}, {
					$sort: {
						createdAt: -1
					}
				}
			]);

		return cursor.toArray();
	}

	private updateUsers(message: Message, members: any[]) {
		for (const data of members) {
			const member = message.guild!.members.cache.get(data.user);
			if (member && data.user_tag !== member.user.tag) {
				this.client.resolver.updateUserTag(message.guild!, data.user);
			}
		}
	}

	private chunks<T>(items: T[] = []) {
		const chunk = 999;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}
