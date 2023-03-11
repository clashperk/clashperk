import { EmbedBuilder } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { container } from 'tsyringe';
import Client from '../struct/Client.js';
import { CAPITAL_LEAGUES, CWL_LEAGUES, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS } from './Emojis.js';
import { Collections, Settings, UnrankedCapitalLeagueId } from './Constants.js';
import { Util } from './index.js';

export const padStart = (str: string | number, length: number) => {
	return `${str}`.padStart(length, ' ');
};

export const padEnd = (str: string | number, length: number) => {
	return `${str}`.padEnd(length, ' ');
};

export const lastSeenTimestampFormat = (timestamp: number) => {
	if (!timestamp) return padStart('', 7);
	return padStart(Util.duration(timestamp + 1e3), 7);
};

export const clanGamesMaxPoints = (month: number) => {
	const client = container.resolve(Client);
	const exceptionalMonths = client.settings.get<number[]>('global', Settings.CLAN_GAMES_EXCEPTIONAL_MONTHS, []);
	if (exceptionalMonths.includes(month)) return 5000;
	return 4000;
};

export const clanGamesSortingAlgorithm = (a: number, b: number) => {
	if (a === b) return 0;
	if (a === 0) return 1;
	if (b === 0) return -1;
	return a - b;
};

export const clanGamesLatestSeasonId = () => {
	const currentDate = new Date();
	if (currentDate.getDate() < 20) currentDate.setMonth(currentDate.getMonth() - 1);
	return currentDate.toISOString().substring(0, 7);
};

export const clanEmbedMaker = async (
	clan: Clan,
	{ description, requirements, color, userId }: { description?: string; requirements?: string; color?: number; userId?: string }
) => {
	const client = container.resolve(Client);
	const fetched = await client.http.detailedClanMembers(clan.memberList);
	const reduced = fetched
		.filter((res) => res.ok)
		.reduce<{ [key: string]: number }>((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

	const townHalls = Object.entries(reduced)
		.map((arr) => ({ level: Number(arr[0]), total: arr[1] }))
		.sort((a, b) => b.level - a.level);

	const location = clan.location
		? clan.location.isCountry
			? `:flag_${clan.location.countryCode.toLowerCase()}: ${clan.location.name}`
			: `🌐 ${clan.location.name}`
		: `${EMOJIS.WRONG} None`;

	const capitalHall = clan.clanCapital?.capitalHallLevel ? ` ${EMOJIS.CAPITAL_HALL} **${clan.clanCapital.capitalHallLevel}**` : '';

	const embed = new EmbedBuilder()
		.setTitle(`${clan.name} (${clan.tag})`)
		// .setAuthor({
		// 	name: `${clan.name} (${clan.tag})`,
		// 	iconURL: clan.badgeUrls.medium,
		// 	url: `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`
		// })
		.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
		.setThumbnail(clan.badgeUrls.medium)
		.setDescription(
			[
				`${EMOJIS.CLAN} **${clan.clanLevel}**${capitalHall} ${EMOJIS.USERS} **${clan.members}** ${EMOJIS.TROPHY} **${clan.clanPoints}** ${EMOJIS.VERSUS_TROPHY} **${clan.clanVersusPoints}**`,
				'',
				description?.toLowerCase() === 'auto' ? clan.description : description ?? ''
			].join('\n')
		);
	if (color) embed.setColor(color);

	embed.addFields([
		{
			name: 'Clan Leader',
			value: [
				`${EMOJIS.OWNER}${userId ? ` <@${userId}>` : ''} (${
					clan.memberList.filter((m) => m.role === 'leader').map((m) => `${m.name}`)[0] || 'None'
				})`
			].join('\n')
		}
	]);

	embed.addFields([
		{
			name: 'Requirements',
			value: [
				`${EMOJIS.TOWNHALL} ${
					requirements?.toLowerCase() === 'auto'
						? clan.requiredTownhallLevel
							? `TH ${clan.requiredTownhallLevel}+`
							: 'Any'
						: requirements ?? 'Any'
				}`,
				'**Trophies Required**',
				`${EMOJIS.TROPHY} ${clan.requiredTrophies}`,
				`**Location** \n${location}`
			].join('\n')
		}
	]);

	embed.addFields([
		{
			name: 'War Performance',
			value: [
				`${EMOJIS.OK} ${clan.warWins} Won ${
					clan.isWarLogPublic ? `${EMOJIS.WRONG} ${clan.warLosses!} Lost ${EMOJIS.EMPTY} ${clan.warTies!} Tied` : ''
				}`,
				'**War Frequency & Streak**',
				`${
					clan.warFrequency.toLowerCase() === 'morethanonceperweek'
						? '🎟️ More Than Once Per Week'
						: `🎟️ ${clan.warFrequency.toLowerCase().replace(/\b(\w)/g, (char) => char.toUpperCase())}`
				} ${'🏅'} ${clan.warWinStreak}`,
				'**War League**',
				`${CWL_LEAGUES[clan.warLeague?.name ?? 'Unranked']} ${clan.warLeague?.name ?? 'Unranked'}`,
				'**Clan Capital**',
				`${CAPITAL_LEAGUES[clan.capitalLeague?.id ?? UnrankedCapitalLeagueId]} ${clan.capitalLeague?.name ?? 'Unranked'} ${
					EMOJIS.CAPITAL_TROPHY
				} ${clan.clanCapitalPoints ?? 0}`
			].join('\n')
		}
	]);

	embed.addFields([
		{
			name: 'Town Halls',
			value: [
				townHalls
					.slice(0, 7)
					.map((th) => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}\u200b`)
					.join(' ')
			].join('\n')
		}
	]);

	embed.setFooter({ text: 'Synced' });
	embed.setTimestamp();
	return embed;
};

export const lastSeenEmbedMaker = async (clan: Clan, { color, scoreView }: { color?: number; scoreView?: boolean }) => {
	const client = container.resolve(Client);

	const db = client.db.collection(Collections.LAST_SEEN);
	const result = await db
		.aggregate<{ count: number; lastSeen: Date; name: string; tag: string; townHallLevel?: number }>([
			{
				$match: { tag: { $in: [...clan.memberList.map((m) => m.tag)] } }
			},
			{
				$match: { 'clan.tag': clan.tag }
			},
			{
				$project: {
					tag: '$tag',
					clan: '$clan',
					lastSeen: '$lastSeen',
					townHallLevel: '$townHallLevel',
					entries: {
						$filter: {
							input: '$entries',
							as: 'en',
							cond: {
								$gte: ['$$en.entry', new Date(Date.now() - (scoreView ? 30 : 1) * 24 * 60 * 60 * 1000)]
							}
						}
					}
				}
			},
			{
				$project: {
					tag: '$tag',
					clan: '$clan',
					townHallLevel: '$townHallLevel',
					lastSeen: '$lastSeen',
					count: {
						$sum: '$entries.count'
					}
				}
			}
		])
		.toArray();

	const _members = clan.memberList.map((m) => {
		const mem = result.find((d) => d.tag === m.tag);
		return {
			tag: m.tag,
			name: m.name,
			townHallLevel: `${mem?.townHallLevel ?? '-'}`,
			count: mem ? Number(mem.count) : 0,
			lastSeen: mem ? new Date().getTime() - new Date(mem.lastSeen).getTime() : 0
		};
	});

	_members.sort((a, b) => a.lastSeen - b.lastSeen);
	const members = _members.filter((m) => m.lastSeen > 0).concat(_members.filter((m) => m.lastSeen === 0));

	const embed = new EmbedBuilder();
	embed.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });
	if (color) embed.setColor(color);

	if (scoreView) {
		members.sort((a, b) => b.count - a.count);
		embed.setDescription(
			[
				'**Clan member activity scores (last 30d)**',
				`\`\`\`\n\u200eTH  ${'TOTAL'.padStart(4, ' ')} AVG  ${'NAME'}\n${members
					.map(
						(m) =>
							`${m.townHallLevel.padStart(2, ' ')}  ${m.count.toString().padStart(4, ' ')}  ${Math.floor(m.count / 30)
								.toString()
								.padStart(3, ' ')}  ${m.name}`
					)
					.join('\n')}`,
				'```'
			].join('\n')
		);
	} else {
		embed.setDescription(
			[
				`**[Last seen and last 24h activity scores](https://clashperk.com/faq)**`,
				`\`\`\`\n\u200eTH  LAST-ON 24H  NAME\n${members
					.map(
						(m) =>
							`${m.townHallLevel.padStart(2, ' ')}  ${lastSeenTimestampFormat(m.lastSeen)}  ${padStart(
								Math.min(m.count, 99),
								2
							)}  ${m.name}`
					)
					.join('\n')}`,
				'```'
			].join('\n')
		);
	}

	embed.setFooter({ text: `Synced [${members.length}/${clan.members}]` });
	embed.setTimestamp();
	return embed;
};

export const clanGamesEmbedMaker = (
	clan: Clan,
	{
		color,
		seasonId,
		members,
		filters
	}: {
		color?: number;
		seasonId: string;
		filters?: { maxPoints?: boolean; minPoints?: boolean };
		members: { name: string; points: number }[];
	}
) => {
	const maxPoints = clanGamesMaxPoints(new Date(seasonId).getMonth());
	const total = members.reduce((prev, mem) => prev + Math.min(mem.points, maxPoints), 0);

	const embed = new EmbedBuilder();
	if (color) embed.setColor(color);
	embed.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });
	embed.setDescription(
		[
			`**[Clan Games Scoreboard (${seasonId})](https://clashperk.com/faq)**`,
			`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
			members
				.slice(0, 55)
				.filter((d) => (filters?.minPoints ? d.points > 0 : d.points >= 0))
				.map((m, i) => {
					const points = padStart(filters?.maxPoints ? m.points : Math.min(maxPoints, m.points), 6);
					return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
				})
				.join('\n'),
			'```'
		].join('\n')
	);

	embed.setFooter({ text: `Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]` });
	embed.setTimestamp();
	return embed;
};
