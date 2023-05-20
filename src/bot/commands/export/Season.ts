import { Clan, ClanMember } from 'clashofclans.js';
import { Collection, CommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { PlayerLinks, PlayerSeasonModel, achievements } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';
import { Season } from '../../util/index.js';

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

		const season = args.season ?? Season.ID;

		const _clans: Clan[] = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		const allMembers = _clans.reduce<(ClanMember & { clanTag: string })[]>((previous, current) => {
			previous.push(...current.memberList.map((mem) => ({ ...mem, clanTag: current.tag })));
			return previous;
		}, []);

		const memberTags: { tag: string; user: string }[] = [];
		let guildMembers = new Collection<string, GuildMember>();
		memberTags.push(...(await this.client.http.getDiscordLinks(allMembers)));
		const dbMembers = await this.client.db
			.collection<PlayerLinks>(Collections.PLAYER_LINKS)
			.find({ tag: { $in: allMembers.map((m) => m.tag) } })
			.toArray();
		if (dbMembers.length) this.updateUsers(interaction, dbMembers);
		for (const member of dbMembers) {
			if (!allMembers.find((mem) => mem.tag === member.tag)) continue;
			if (memberTags.find((mem) => mem.tag === member.tag)) continue;
			memberTags.push({ tag: member.tag, user: member.userId });
		}
		const fetchedMembers = await Promise.all(
			this.chunks(memberTags).map((members) => interaction.guild.members.fetch({ user: members.map((m) => m.user) }))
		);
		guildMembers = guildMembers.concat(...fetchedMembers);

		const members = (await Promise.all(_clans.map((clan) => this.aggregationQuery(clan, season)))).flat();
		for (const mem of members) {
			const user = memberTags.find((m) => m.tag === mem.tag)?.user;
			mem.userTag = guildMembers.get(user!)?.user.username;
		}
		guildMembers.clear();

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

		if (!members.length) {
			return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		}

		const sheets: CreateGoogleSheet[] = [
			{
				columns: [
					{ name: 'Name', width: 160, align: 'LEFT' },
					{ name: 'Tag', width: 120, align: 'LEFT' },
					{ name: 'Discord', width: 160, align: 'LEFT' },
					{ name: 'Clan', width: 160, align: 'LEFT' },
					{ name: 'Town Hall', width: 100, align: 'RIGHT' },
					{ name: 'Total Donated', width: 100, align: 'RIGHT' },
					{ name: 'Total Received', width: 100, align: 'RIGHT' },
					{ name: 'Total Attacks', width: 100, align: 'RIGHT' },
					{ name: 'Versus Attacks', width: 100, align: 'RIGHT' },
					{ name: 'Trophies Gained', width: 100, align: 'RIGHT' },
					{ name: 'Season-End Trophies', width: 100, align: 'RIGHT' },
					{ name: 'Versus-Trophies Gained', width: 100, align: 'RIGHT' },
					{ name: 'War-Stars Gained', width: 100, align: 'RIGHT' },
					{ name: 'CWL-Stars Gained', width: 100, align: 'RIGHT' },
					{ name: 'Gold Looted', width: 100, align: 'RIGHT' },
					{ name: 'Elixir Lotted', width: 100, align: 'RIGHT' },
					{ name: 'Dark Elixir Looted', width: 100, align: 'RIGHT' },
					{ name: 'Clan Games', width: 100, align: 'RIGHT' },
					{ name: 'Capital Gold Looted', width: 100, align: 'RIGHT' },
					{ name: 'Capital Gold Contributed', width: 100, align: 'RIGHT' },
					{ name: 'Activity Score', width: 100, align: 'RIGHT' }
				],
				rows: members.map((m) => [
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
				]),
				title: `Season ${season}`
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Season Stats: ${season}]`, sheets);
		return interaction.editReply({ content: `**Season Export (${season})**`, components: getExportComponents(spreadsheet) });
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

	private updateUsers(interaction: CommandInteraction, members: PlayerLinks[]) {
		for (const data of members) {
			const member = interaction.guild!.members.cache.get(data.userId);
			if (member && data.username !== member.user.username) {
				this.client.resolver.updateUserTag(interaction.guild!, data.userId);
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
