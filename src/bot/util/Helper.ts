import { Clan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild } from 'discord.js';
import { container } from 'tsyringe';
import Client from '../struct/Client.js';
import { PlayerLinks } from '../types/index.js';
import { Collections, Settings, UnrankedCapitalLeagueId } from './Constants.js';
import { CAPITAL_LEAGUES, CWL_LEAGUES, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS } from './Emojis.js';
import { Util } from './index.js';

export const padStart = (str: string | number, length: number) => {
	return `${str}`.padStart(length, ' ');
};

export const padEnd = (str: string | number, length: number) => {
	return `${str}`.padEnd(length, ' ');
};

export const sanitizeName = (name: string) => {
	return Util.escapeBackTick(name);
};

const localeSort = (a: string, b: string) => {
	return a.replace(/[^\x00-\xF7]+/g, '').localeCompare(b.replace(/[^\x00-\xF7]+/g, ''));
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
	// return a === 0 ? 1 : b === 0 ? -1 : a - b;
};

export const clanGamesLatestSeasonId = () => {
	const currentDate = new Date();
	if (currentDate.getDate() < 20) currentDate.setMonth(currentDate.getMonth() - 1);
	return currentDate.toISOString().substring(0, 7);
};

export const clanEmbedMaker = async (
	clan: Clan,
	{ description, requirements, color }: { description?: string; requirements?: string; color?: number; userId?: string }
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
		.map(([level, total]) => ({ level: Number(level), total }))
		.sort((a, b) => b.level - a.level);

	const location = clan.location
		? clan.location.isCountry
			? `:flag_${clan.location.countryCode.toLowerCase()}: ${clan.location.name}`
			: `🌐 ${clan.location.name}`
		: `${EMOJIS.WRONG} None`;

	const capitalHall = clan.clanCapital?.capitalHallLevel ? ` ${EMOJIS.CAPITAL_HALL} **${clan.clanCapital.capitalHallLevel}**` : '';

	const embed = new EmbedBuilder()
		.setTitle(`${clan.name} (${clan.tag})`)
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

	const leaders = clan.memberList.filter((m) => m.role === 'leader');
	const users = await client.db
		.collection<PlayerLinks>(Collections.PLAYER_LINKS)
		.find({ tag: { $in: leaders.map(({ tag }) => tag) } })
		.toArray();

	if (leaders.length) {
		embed.addFields([
			{
				name: 'Clan Leader',
				value: leaders
					.map((leader) => {
						const user = users.find((u) => u.tag === leader.tag);
						return user ? `${EMOJIS.OWNER} <@${user.userId}> (${leader.name})` : `${EMOJIS.OWNER} ${leader.name}`;
					})
					.join('\n')
			}
		]);
	}

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

	if (townHalls.length) {
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
	}

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
	const maxTotal = maxPoints === 5000 ? 75000 : 50000;
	const tiers = [3000, 7500, 12000, 18000, 30000, 50000, 75000];

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

	if (total <= maxTotal) {
		const maxBars = 38;
		const next = tiers.find((t) => t > total) ?? maxTotal;
		const progress = Math.floor((total / next) * maxBars);
		const progressBar = [...Array(progress).fill('◼'), ...Array(maxBars - progress).fill('◻')].join('');
		const text = `${total} && ${next} (Tier ${tiers.indexOf(next) + 1})`;

		embed.setDescription(
			[
				embed.data.description!,
				`${EMOJIS.CLAN_GAMES} \`${text.replace(/&&/g, ''.padStart(maxBars - text.length - 1, ' '))}\``,
				`\`${progressBar}\``
			].join('\n')
		);
	}

	embed.setFooter({ text: `Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]` });
	embed.setTimestamp();
	return embed;
};

export const linkListEmbedMaker = async ({ clan, guild, showTag }: { clan: Clan; guild: Guild; showTag?: boolean }) => {
	const client = container.resolve(Client);
	const memberTags = await client.http.getDiscordLinks(clan.memberList);
	const dbMembers = await client.db
		.collection<PlayerLinks>(Collections.PLAYER_LINKS)
		.find({ tag: { $in: clan.memberList.map((m) => m.tag) } })
		.toArray();

	const members: { name: string; tag: string; userId: string; verified: boolean }[] = [];
	for (const m of memberTags) {
		const clanMember = clan.memberList.find((mem) => mem.tag === m.tag);
		if (!clanMember) continue;
		members.push({ tag: m.tag, userId: m.user, name: clanMember.name, verified: false });
	}

	for (const member of dbMembers) {
		const clanMember = clan.memberList.find((mem) => mem.tag === member.tag);
		if (!clanMember) continue;

		const mem = members.find((mem) => mem.tag === member.tag);
		if (mem) mem.verified = member.verified;
		else members.push({ tag: member.tag, userId: member.userId, name: clanMember.name, verified: member.verified });
	}

	const userIds = members.reduce<string[]>((prev, curr) => {
		if (!prev.includes(curr.userId)) prev.push(curr.userId);
		return prev;
	}, []);
	const guildMembers = await guild.members.fetch({ user: userIds });

	// players linked and on the guild.
	const onDiscord = members.filter((mem) => guildMembers.has(mem.userId));
	// linked to discord but not on the guild.
	const notInDiscord = members.filter((mem) => !guildMembers.has(mem.userId));
	// not linked to discord.
	const notLinked = clan.memberList.filter(
		(m) => !notInDiscord.some((en) => en.tag === m.tag) && !members.some((en) => en.tag === m.tag && guildMembers.has(en.userId))
	);

	const chunks = Util.splitMessage(
		[
			`${EMOJIS.DISCORD} **Players on Discord: ${onDiscord.length}**`,
			onDiscord
				.map((mem) => {
					const name = sanitizeName(mem.name).padEnd(15, ' ');
					const member = clan.memberList.find((m) => m.tag === mem.tag)!;
					const user = showTag
						? member.tag.padStart(12, ' ')
						: guildMembers.get(mem.userId)!.displayName.substring(0, 12).padStart(12, ' ');
					return { name, user, verified: mem.verified };
				})
				.sort((a, b) => localeSort(a.name, b.name))
				.map(({ name, user, verified }) => {
					return `${verified ? '**✓**' : '✘'} \`\u200e${name}\u200f\` \u200e \` ${user} \u200f\``;
				})
				.join('\n'),
			notInDiscord.length ? `\n${EMOJIS.WRONG} **Players not on Discord: ${notInDiscord.length}**` : '',
			notInDiscord
				.map((mem) => {
					const name = sanitizeName(mem.name).padEnd(15, ' ');
					const member = clan.memberList.find((m) => m.tag === mem.tag)!;
					const user: string = member.tag.padStart(12, ' ');
					return { name, user, verified: mem.verified };
				})
				.sort((a, b) => localeSort(a.name, b.name))
				.map(({ name, user, verified }) => {
					return `${verified ? '**✓**' : '✘'} \`\u200e${name}\u200f\` \u200e \` ${user} \u200f\``;
				})
				.join('\n'),
			notLinked.length ? `\n${EMOJIS.WRONG} **Players not Linked: ${notLinked.length}**` : '',
			notLinked
				.sort((a, b) => localeSort(a.name, b.name))
				.map((mem) => {
					const name = sanitizeName(mem.name).padEnd(15, ' ');
					return `✘ \`\u200e${name}\u200f\` \u200e \` ${mem.tag.padStart(12, ' ')} \u200f\``;
				})
				.join('\n')
		]
			.filter((text) => text)
			.join('\n'),
		{ maxLength: 4096 }
	);

	const embed = new EmbedBuilder()
		.setColor(client.embed(guild.id))
		.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
		.setDescription(chunks.at(0)!);
	if (chunks.length > 1) {
		embed.addFields(chunks.slice(1).map((chunk) => ({ name: '\u200b', value: chunk })));
	}

	return embed;
};

export const attacksEmbedMaker = async ({ clan, guild, sortKey }: { clan: Clan; guild: Guild; sortKey: 'attackWins' | 'defenseWins' }) => {
	const client = container.resolve(Client);

	const fetched = await client.http.detailedClanMembers(clan.memberList);
	const members = fetched
		.filter((res) => res.ok)
		.map((m) => ({
			name: m.name,
			tag: m.tag,
			attackWins: m.attackWins,
			defenseWins: m.defenseWins
		}));
	members.sort((a, b) => b[sortKey] - a[sortKey]);

	const embed = new EmbedBuilder()
		.setColor(client.embed(guild.id))
		.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
		.setDescription(
			[
				'```',
				`\u200e ${'#'}  ${'ATK'}  ${'DEF'}  ${'NAME'.padEnd(15, ' ')}`,
				members
					.map((member, i) => {
						const name = `${member.name.replace(/\`/g, '\\').padEnd(15, ' ')}`;
						const attackWins = `${member.attackWins.toString().padStart(3, ' ')}`;
						const defenseWins = `${member.defenseWins.toString().padStart(3, ' ')}`;
						return `${(i + 1).toString().padStart(2, ' ')}  ${attackWins}  ${defenseWins}  \u200e${name}`;
					})
					.join('\n'),
				'```'
			].join('\n')
		);

	return embed;
};

/**
 * @param sheet must be `spreadsheet.data`
 */
export const getExportComponents = (sheet: { spreadsheetUrl: string; spreadsheetId: string }) => {
	return [
		new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Google Sheet').setURL(sheet.spreadsheetUrl),
			new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Open in Web').setURL(sheet.spreadsheetUrl.replace('edit', 'pubhtml'))
		),
		new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel('Download')
				.setURL(`https://docs.google.com/spreadsheets/export?id=${sheet.spreadsheetId}&exportFormat=xlsx`)
		)
	];
};
