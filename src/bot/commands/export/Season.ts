import { Clan, ClanMember } from 'clashofclans.js';
import { Collection, GuildMember, CommandInteraction } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Season } from '../../util/index.js';
import { Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';
import { achievements, PlayerSeasonModel } from '../../types/index.js';

export default class ExportSeason extends Command {
	public constructor() {
		super('export-season', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { season?: string; clans?: string }) {
		const tags = this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const season = args.season ?? Season.ID;
		const workbook = new Excel();
		const sheet = workbook.addWorksheet(season);
		const patron = this.client.patrons.get(interaction.guild.id);

		const _clans: Clan[] = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		const allMembers = _clans.reduce<(ClanMember & { clanTag: string })[]>((previous, current) => {
			previous.push(...current.memberList.map((mem) => ({ ...mem, clanTag: current.tag })));
			return previous;
		}, []);

		const memberTags: { tag: string; user: string }[] = [];
		let guildMembers = new Collection<string, GuildMember>();
		if (patron) {
			memberTags.push(...(await this.client.http.getDiscordLinks(allMembers)));
			const dbMembers = await this.client.db
				.collection(Collections.LINKED_PLAYERS)
				.find({ 'entries.tag': { $in: allMembers.map((m) => m.tag) } })
				.toArray();
			if (dbMembers.length) this.updateUsers(interaction, dbMembers);
			for (const member of dbMembers) {
				for (const m of member.entries) {
					if (!allMembers.find((mem) => mem.tag === m.tag)) continue;
					if (memberTags.find((mem) => mem.tag === m.tag)) continue;
					memberTags.push({ tag: m.tag, user: member.user });
				}
			}
			const fetchedMembers = await Promise.all(
				this.chunks(memberTags).map((members) => interaction.guild.members.fetch({ user: members.map((m) => m.user) }))
			);
			guildMembers = guildMembers.concat(...fetchedMembers);
		}

		const members = (await Promise.all(_clans.map((clan) => this.aggregationQuery(clan, season)))).flat();
		for (const mem of members) {
			const user = memberTags.find((user) => user.tag === mem.tag)?.user;
			mem.userTag = guildMembers.get(user!)?.user.tag;
		}
		guildMembers.clear();

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
			{ header: 'Season-End Trophies', width: 12 },
			{ header: 'Versus-Trophies Gained', width: 12 },
			{ header: 'War-Stars Gained', width: 10 },
			{ header: 'CWL-Stars Gained', width: 10 },
			{ header: 'Gold Grab', width: 10 },
			{ header: 'Elixir Escapade', width: 10 },
			{ header: 'Heroic Heist', width: 10 },
			{ header: 'Clan Games', width: 10 },
			{ header: 'Capital Gold Looted', width: 10 },
			{ header: 'Capital Gold Contributed', width: 10 },
			{ header: 'Activity Score', width: 10 }
		];

		if (!patron) columns.splice(2, 1);
		// if (season !== Season.ID) columns.splice(-1);
		sheet.columns = [...columns] as any[];
		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		const __achievements = (
			[
				'War League Legend',
				'Gold Grab',
				'Elixir Escapade',
				'Heroic Heist',
				'Games Champion',
				'Aggressive Capitalism',
				'Most Valuable Clanmate'
			] as const
		).map((a) => achievements[a]);
		sheet.addRows(
			members.map((m) => {
				const rows = [
					m.name,
					m.tag,
					m.userTag,
					m.clans[m.clanTag].name,
					m.townHallLevel,
					m.clans[m.clanTag].donations.total,
					m.clans[m.clanTag].donationsReceived.total,
					m.attackWins,
					m.versusBattleWins.current - m.versusBattleWins.initial,
					m.trophies.current - m.trophies.initial,
					m.trophies.current,
					m.versusTrophies.current - m.versusTrophies.initial,
					m.clanWarStars.current - m.clanWarStars.initial,
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					...__achievements.map((ac) => (m[ac]?.current ?? 0) - (m[ac]?.initial ?? 0)),
					m.score ?? 0
				];

				if (!patron) rows.splice(2, 1);
				// if (season !== Season.ID) rows.splice(-1);
				return rows;
			})
		);

		if (!members.length) {
			// TODO: season id
			return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return interaction.editReply({
			content: `**Season Export (${season})**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'season_export.xlsx'
				}
			]
		});
	}

	private async aggregationQuery(clan: Clan, seasonId: string) {
		const cursor = this.client.db.collection(Collections.PLAYER_SEASONS).aggregate<PlayerSeasonModelAggregated>([
			{
				$match: {
					season: seasonId,
					__clans: clan.tag,
					tag: { $in: clan.memberList.map((m) => m.tag) }
				}
			},
			{
				$lookup: {
					from: Collections.LAST_SEEN,
					localField: 'tag',
					foreignField: 'tag',
					as: 'lastSeen',
					pipeline: [{ $project: { seasons: 1 } }]
				}
			},
			{
				$unwind: {
					path: '$lastSeen',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$set: {
					score: `$lastSeen.seasons.${seasonId}`,
					clans: {
						[clan.tag]: `$clans.${clan.tag}`
					},
					clanTag: clan.tag
				}
			},
			{
				$unset: 'lastSeen'
			},
			{
				$lookup: {
					from: Collections.CLAN_GAMES_POINTS,
					localField: 'tag',
					foreignField: 'tag',
					as: 'clanGamesPoints',
					pipeline: [
						{
							$match: {
								season: seasonId
							}
						},
						{
							$project: {
								initial: 1,
								current: 1
							}
						}
					]
				}
			},
			{
				$unwind: {
					path: '$clanGamesPoints',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$sort: { _id: -1 }
			}
		]);

		return cursor.toArray();
	}

	private updateUsers(interaction: CommandInteraction, members: any[]) {
		for (const data of members) {
			const member = interaction.guild!.members.cache.get(data.user);
			if (member && data.user_tag !== member.user.tag) {
				this.client.resolver.updateUserTag(interaction.guild!, data.user);
			}
		}
	}

	private chunks<T>(items: T[] = []) {
		const chunk = 100;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}

type PlayerSeasonModelAggregated = PlayerSeasonModel & {
	score?: number;
	clanTag: string;
	userTag?: string;
};
