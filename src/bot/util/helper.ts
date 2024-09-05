import { PlayerSeasonsEntity } from '@app/entities';
import { APIClan, APIPlayer, APIPlayerClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Guild,
  StringSelectMenuBuilder,
  escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { AnyBulkWriteOperation, ObjectId } from 'mongodb';
import { title } from 'radash';
import { container } from 'tsyringe';
import { LegendAttacksEntity } from '../entities/legend-attacks.entity.js';
import Client from '../struct/client-module.js';
import { ClanEmbedFields } from './command-options.js';
import { Collections, Settings, UNRANKED_CAPITAL_LEAGUE_ID } from './constants.js';
import { BLUE_NUMBERS, CAPITAL_LEAGUES, CWL_LEAGUES, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS } from './emojis.js';
import { Season, Util } from './index.js';

export const hexToNanoId = (hex: ObjectId) => {
  return hex.toHexString().slice(-5).toUpperCase();
};

export const makeAbbr = (text: string) => {
  return title(text)
    .split(/\s+/)
    .map((word) => word[0].toUpperCase())
    .join('');
};

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

const isNullish = (value: unknown) => typeof value === 'undefined' || value === null;

export const sumHeroes = (player: APIPlayer) => {
  return player.heroes.reduce((prev, curr) => {
    if (curr.village === 'builderBase') return prev;
    return curr.level + prev;
  }, 0);
};

export const nullsLastSortAlgo = (a: unknown, b: unknown) => {
  // Compare null values
  if (isNullish(a) && isNullish(b)) {
    return 0;
  } else if (isNullish(a)) {
    return 1; // Move null values to the end
  } else if (isNullish(b)) {
    return -1; // Move null values to the end
  }

  return 10;

  // Compare non-null values
  // if (typeof a === 'number' && typeof b === 'number') {
  // 	return a - b; // Numeric comparison
  // } else {
  // 	return String(a).localeCompare(String(b)); // String comparison for non-numeric values
  // }
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
  return currentDate.toISOString().slice(0, 7);
};

export const clanEmbedMaker = async (
  clan: APIClan,
  {
    description,
    accepts,
    color,
    bannerImage,
    fields
  }: {
    description?: string;
    accepts?: string;
    color?: number;
    bannerImage?: string;
    isDryRun?: boolean;
    fields?: string[];
  }
) => {
  if (!fields || fields?.includes('*')) fields = Object.values(ClanEmbedFields);

  const client = container.resolve(Client);
  const reduced = clan.memberList.reduce<{ [key: string]: number }>((count, member) => {
    const townHall = member.townHallLevel;
    count[townHall] = (count[townHall] || 0) + 1;
    return count;
  }, {});

  const townHalls = Object.entries(reduced)
    .map(([level, total]) => ({ level: Number(level), total }))
    .sort((a, b) => b.level - a.level);

  const capitalHall = clan.clanCapital.capitalHallLevel ? ` ${EMOJIS.CAPITAL_HALL} **${clan.clanCapital.capitalHallLevel}**` : '';

  const embed = new EmbedBuilder()
    .setTitle(`${clan.name} (${clan.tag})`)
    .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
    .setThumbnail(clan.badgeUrls.medium)
    .setDescription(
      [
        `${EMOJIS.CLAN} **${clan.clanLevel}**${capitalHall} ${EMOJIS.USERS} **${clan.members}** ${EMOJIS.TROPHY} **${clan.clanPoints}** ${EMOJIS.BB_TROPHY} **${clan.clanBuilderBasePoints}**`,
        '',
        description?.toLowerCase() === 'auto' ? clan.description : description ?? ''
      ].join('\n')
    );

  if (color) embed.setColor(color);
  if (bannerImage) embed.setImage(bannerImage);

  const leaders = clan.memberList.filter((m) => m.role === 'leader');
  if (leaders.length && fields?.includes(ClanEmbedFields.CLAN_LEADER)) {
    const users = await client.db
      .collection(Collections.PLAYER_LINKS)
      .find({ tag: { $in: leaders.map(({ tag }) => tag) } })
      .toArray();

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

  if (fields?.includes(ClanEmbedFields.REQUIREMENTS)) {
    embed.addFields({
      name: 'Requirements',
      value: `${EMOJIS.TOWN_HALL} ${
        !accepts || accepts?.toLowerCase() === 'auto'
          ? clan.requiredTownhallLevel
            ? `TH ${clan.requiredTownhallLevel}+`
            : 'Any'
          : accepts ?? 'Any'
      }`
    });
  }

  if (fields?.includes(ClanEmbedFields.TROPHIES_REQUIRED)) {
    embed.addFields({
      name: 'Trophies Required',
      value: `${EMOJIS.TROPHY} ${clan.requiredTrophies}${
        clan.requiredBuilderBaseTrophies ? ` ${EMOJIS.BB_TROPHY} ${clan.requiredBuilderBaseTrophies}` : ''
      }`
    });
  }

  if (fields?.includes(ClanEmbedFields.LOCATION) && clan.location) {
    const location = clan.location
      ? clan.location.isCountry
        ? `:flag_${clan.location.countryCode!.toLowerCase()}: ${clan.location.name}`
        : `🌐 ${clan.location.name}`
      : `${EMOJIS.WRONG} None`;

    embed.addFields({
      name: 'Location',
      value: `${location}`
    });
  }

  if (fields?.includes(ClanEmbedFields.WAR_PERFORMANCE)) {
    embed.addFields({
      name: 'War Performance',
      value: `${EMOJIS.OK} ${clan.warWins} Won${
        clan.isWarLogPublic ? ` ${EMOJIS.WRONG} ${clan.warLosses!} Lost ${EMOJIS.EMPTY} ${clan.warTies!} Tied` : ''
      } ${clan.warWinStreak > 0 ? `🏅 ${clan.warWinStreak} Win Streak` : ''}`
    });
  }

  if (!['unknown', 'never'].includes(clan.warFrequency) && fields?.includes(ClanEmbedFields.WAR_FREQUENCY)) {
    embed.addFields({
      name: 'War Frequency',
      value: `${
        clan.warFrequency.toLowerCase() === 'morethanonceperweek'
          ? '🎟️ More Than Once Per Week'
          : `🎟️ ${clan.warFrequency.toLowerCase().replace(/\b(\w)/g, (char) => char.toUpperCase())}`
      }`
    });
  }

  if (fields?.includes(ClanEmbedFields.CLAN_WAR_LEAGUE)) {
    embed.addFields({
      name: 'Clan War League',
      value: `${CWL_LEAGUES[clan.warLeague?.name ?? 'Unranked']} ${clan.warLeague?.name ?? 'Unranked'}`
    });
  }

  if (fields?.includes(ClanEmbedFields.CLAN_CAPITAL_LEAGUE)) {
    embed.addFields({
      name: 'Clan Capital League',
      value: `${CAPITAL_LEAGUES[clan.capitalLeague?.id ?? UNRANKED_CAPITAL_LEAGUE_ID]} ${clan.capitalLeague?.name ?? 'Unranked'} ${
        EMOJIS.CAPITAL_TROPHY
      } ${clan.clanCapitalPoints || 0}`
    });
  }

  if (townHalls.length && fields?.includes(ClanEmbedFields.TOWN_HALLS)) {
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

export const lastSeenEmbedMaker = async (clan: APIClan, { color, scoreView }: { color?: number | null; scoreView?: boolean }) => {
  const client = container.resolve(Client);

  const db = client.db.collection(Collections.PLAYERS);
  const playerTags = clan.memberList.map((m) => m.tag);
  const result = await db
    .aggregate<{ lastSeen: Date; name: string; tag: string; townHallLevel?: number }>([
      {
        $match: { tag: { $in: playerTags } }
      },
      {
        $project: {
          name: '$name',
          tag: '$tag',
          lastSeen: '$lastSeen',
          townHallLevel: '$townHallLevel'
        }
      }
    ])
    .toArray();

  const body = await client.elastic.search<unknown, { players: { buckets: { key: string; doc_count: number }[] } }>({
    query: {
      bool: {
        filter: [
          {
            terms: {
              tag: playerTags
            }
          },
          {
            range: {
              timestamp: {
                gte: scoreView ? 'now-30d/d' : 'now-24h/h',
                lte: 'now'
              }
            }
          }
        ]
      }
    },
    size: 0,
    aggs: {
      players: {
        terms: {
          field: 'tag',
          size: 50
        }
      }
    }
  });

  const activityMap = Object.fromEntries((body.aggregations?.players.buckets ?? []).map((bucket) => [bucket.key, bucket.doc_count]));
  const _members = clan.memberList.map((m) => {
    const mem = result.find((d) => d.tag === m.tag);
    return {
      tag: m.tag,
      name: m.name,
      townHallLevel: m.townHallLevel.toString(),
      count: activityMap[m.tag] || 0,
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
        '```',
        `TH  TOTAL AVG  NAME`,
        members
          .map((m) => {
            const townHallLevel = padStart(m.townHallLevel, 2);
            const count = padStart(Math.floor(m.count / 30), 3);
            return `${townHallLevel}  ${padStart(m.count, 4)}  ${count}  ${m.name}`;
          })
          .join('\n'),
        '```'
      ].join('\n')
    );
  } else {
    embed.setDescription(
      [
        `**[Last seen and last 24h activity scores](https://clashperk.com/faq)**`,
        '```',
        `TH  LAST-ON 24H  NAME`,
        members
          .map((m) => {
            const townHallLevel = padStart(m.townHallLevel, 2);
            return `${townHallLevel}  ${lastSeenTimestampFormat(m.lastSeen)}  ${padStart(Math.min(m.count, 99), 2)}  ${m.name}`;
          })
          .join('\n'),
        '```'
      ].join('\n')
    );
  }

  embed.setFooter({ text: `Synced [${members.length}/${clan.members}]` });
  embed.setTimestamp();
  return embed;
};

export const clanGamesEmbedMaker = (
  clan: APIClan,
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
    // const progress = Math.floor((total / next) * maxBars);
    // const progressBar = [...Array(progress).fill('■'), ...Array(maxBars - progress).fill('□')].join('');
    const text = `${total} && ${next} (Tier ${tiers.indexOf(next) + 1})`;

    embed.setDescription(
      [
        embed.data.description!,
        `${EMOJIS.CLAN_GAMES} \`${text.replace(/&&/g, '-'.padStart(maxBars - text.length - 1, '-'))}\``
        // `\`${progressBar}\``
      ].join('\n')
    );
  }

  embed.setFooter({ text: `Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]` });
  embed.setTimestamp();
  return embed;
};

export const linkListEmbedMaker = async ({ clan, guild, showTag }: { clan: APIClan; guild: Guild; showTag?: boolean }) => {
  const client = container.resolve(Client);
  const memberTags = await client.http.getDiscordLinks(clan.memberList);
  const dbMembers = await client.db
    .collection(Collections.PLAYER_LINKS)
    .find({ tag: { $in: clan.memberList.map((m) => m.tag) } })
    .toArray();

  const members: { name: string; tag: string; userId: string; verified: boolean }[] = [];
  for (const m of memberTags) {
    const clanMember = clan.memberList.find((mem) => mem.tag === m.tag);
    if (!clanMember) continue;
    members.push({ tag: m.tag, userId: m.userId, name: clanMember.name, verified: false });
  }

  for (const member of dbMembers) {
    const clanMember = clan.memberList.find((mem) => mem.tag === member.tag);
    if (!clanMember) continue;

    const mem = members.find((mem) => mem.tag === member.tag);
    if (mem) mem.verified = member.verified;
    else members.push({ tag: member.tag, userId: member.userId, name: clanMember.name, verified: member.verified });
  }

  const guildMembers = await guild.members.fetch();
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
          const user = showTag ? member.tag.padStart(12, ' ') : guildMembers.get(mem.userId)!.displayName.slice(0, 12).padStart(12, ' ');
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

export const attacksEmbedMaker = async ({
  clan,
  guild,
  sortKey
}: {
  clan: APIClan;
  guild: Guild;
  sortKey: 'attackWins' | 'defenseWins';
}) => {
  const client = container.resolve(Client);

  const fetched = await client.http._getPlayers(clan.memberList);
  const members = fetched.map((data) => ({
    name: data.name,
    tag: data.tag,
    attackWins: data.attackWins,
    defenseWins: data.defenseWins
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

export const welcomeEmbedMaker = () => {
  const client = container.resolve(Client);
  const embed = new EmbedBuilder()
    .setDescription(
      [
        '### Greetings!',
        `- Let's start with ${client.commands.SETUP_ENABLE} command to link your clan or enable features.`,
        `- Then ${client.commands.LINK_CREATE} command to link your Clash of Clans account to your Discord.`,
        `- That's it! You are ready to use the bot!`,
        '',
        `- Join [Support Server](https://discord.gg/ppuppun) if you need any help or visit our [Website](https://clashperk.com) for a guide.`,
        `- If you like the bot, you can support us on [Patreon](https://www.patreon.com/clashperk)`
      ].join('\n')
    )
    .setImage('https://i.imgur.com/jcWPjDf.png');

  return embed;
};

export const getLegendRankingEmbedMaker = async ({
  clanTags,
  guild,
  sort_by,
  limit,
  seasonId
}: {
  guild: Guild;
  clanTags?: string[];
  sort_by?: string;
  limit?: number;
  seasonId: string;
}) => {
  const client = container.resolve(Client);
  clanTags ??= (await client.storage.find(guild.id)).map((clan) => clan.tag);

  const _clans = await client.redis.getClans(clanTags);
  const memberTags = _clans.map((clan) => clan.memberList.map((member) => member.tag)).flat();
  const _players = await client.redis.getPlayers(memberTags);

  const playersMap = _players.reduce<Record<string, { townHallLevel: number; attackWins: number; clan?: APIPlayerClan; trophies: number }>>(
    (prev, curr) => {
      prev[curr.tag] = {
        townHallLevel: curr.townHallLevel,
        attackWins: curr.attackWins,
        clan: curr.clan,
        trophies: curr.trophies
      };
      return prev;
    },
    {}
  );

  const legends = await client.db
    .collection<Omit<LegendAttacksEntity, 'logs'>>(Collections.LEGEND_ATTACKS)
    .find({ tag: { $in: _players.map(({ tag }) => tag) }, seasonId }, { projection: { logs: 0 } })
    .toArray();

  let players = legends
    .map((legend) => {
      const player = playersMap[legend.tag];
      return {
        name: legend.name,
        tag: legend.tag,
        clan: player.clan,
        actualTrophies: player.trophies,
        trophies: legend.trophies,
        attackWins: player.attackWins,
        townHallLevel: player.townHallLevel
      };
    })
    .filter((legend) => legend.actualTrophies >= 4900);

  if (sort_by === 'town_hall_asc') {
    players.sort((a, b) => b.trophies - a.trophies);
    players.sort((a, b) => a.townHallLevel - b.townHallLevel);
  } else if (sort_by === 'town_hall_desc') {
    players.sort((a, b) => b.trophies - a.trophies);
    players.sort((a, b) => b.townHallLevel - a.townHallLevel);
  } else {
    players.sort((a, b) => b.trophies - a.trophies);
  }

  if (limit) players = players.slice(0, limit);

  const embed = new EmbedBuilder();
  embed.setColor(client.embed(guild.id));
  embed.setAuthor({ name: `${guild.name} Legend Leaderboard (${moment(seasonId).format('MMM YYYY')})`, iconURL: guild.iconURL()! });
  embed.setFooter({ text: 'Synced' });
  embed.setTimestamp();

  if (players.length) {
    embed.setDescription(
      [
        '```',
        `\u200e #  TH TROPHY WON  NAME`,
        ...players.slice(0, 99).map((player, n) => {
          const trophies = player.trophies;
          const attacks = padStart(player.attackWins, 3);
          const name = Util.escapeBackTick(player.name);
          const townHall = padStart(player.townHallLevel, 2);
          return `\u200e${padStart(n + 1, 2)}  ${townHall}  ${trophies}  ${attacks}  ${name}`;
        }),
        '```'
      ].join('\n')
    );
  }

  if ((!sort_by || sort_by === 'trophies_only') && players.length) {
    embed.setDescription(
      players
        .slice(0, 50)
        .map((player, idx) => {
          const name = escapeMarkdown(`${player.name}${player.clan ? ` | ${player.clan.name}` : ''}`);
          return `${BLUE_NUMBERS[idx + 1]} \`${player.trophies}\` \u200b \u200e${name}`;
        })
        .join('\n')
    );
  }

  return { embed, players };
};

export const getBbLegendRankingEmbedMaker = async ({
  clanTags,
  guild,
  limit,
  seasonId
}: {
  guild: Guild;
  clanTags?: string[];
  sort_by?: string;
  limit?: number;
  seasonId: string;
}) => {
  const client = container.resolve(Client);
  clanTags ??= (await client.storage.find(guild.id)).map((clan) => clan.tag);

  const _clans = await client.redis.getClans(clanTags);
  const memberTags = _clans.map((clan) => clan.memberList.map((member) => member.tag)).flat();
  const _players = await client.redis.getPlayers(memberTags);

  const playersMap = _players.reduce<Record<string, { clan?: APIPlayerClan; attackWins: number; townHallLevel: number }>>((prev, curr) => {
    prev[curr.tag] = {
      clan: curr.clan,
      attackWins: curr.attackWins,
      townHallLevel: curr.townHallLevel
    };
    return prev;
  }, {});

  const result = await client.db
    .collection<{ name: string; tag: string; versusTrophies: { current: number }; builderHallLevel: number }>(Collections.PLAYER_SEASONS)
    .find(
      { season: seasonId, tag: { $in: _players.map(({ tag }) => tag) } },
      { projection: { name: 1, tag: 1, versusTrophies: 1, builderHallLevel: 1 } }
    )
    .toArray();

  let players = result.map((player) => {
    const _player = playersMap[player.tag];
    return {
      name: player.name,
      tag: player.tag,
      clan: _player.clan,
      attackWins: _player.attackWins,
      townHallLevel: _player.townHallLevel,
      trophies: player.versusTrophies.current ?? 0,
      builderHallLevel: player.builderHallLevel
    };
  });

  players = players.filter((player) => player.trophies >= 5000);

  players.sort((a, b) => b.trophies - a.trophies);
  if (limit) players = players.slice(0, limit);

  const embed = new EmbedBuilder();
  embed.setColor(client.embed(guild.id));
  embed.setAuthor({
    name: `${guild.name} Builder Base Leaderboard (${moment(seasonId).format('MMM YYYY')})`,
    iconURL: guild.iconURL()!
  });
  embed.setFooter({ text: 'Synced' });
  embed.setTimestamp();
  if (players.length) {
    embed.setDescription(
      players
        .slice(0, 50)
        .map((player, idx) => {
          const name = escapeMarkdown(`${player.name}${player.clan ? ` | ${player.clan.name}` : ''}`);
          return `${BLUE_NUMBERS[idx + 1]} \`${player.trophies}\` \u200b \u200e${name}`;
        })
        .join('\n')
    );
  }

  return { embed, players };
};

export const getMenuFromMessage = (interaction: ButtonInteraction, selected: string, customId: string) => {
  const _components = interaction.message.components;
  const mainIndex = _components.findIndex(({ components }) => components.length === 4);
  const components = _components.slice(mainIndex + 1);
  const component = components.at(0)?.components.at(0);

  if (component && component.type === ComponentType.StringSelect) {
    const menu = StringSelectMenuBuilder.from(component.toJSON());
    const options = component.options.map((op) => ({
      ...op,
      default: op.value === selected
    }));
    menu.setOptions(options);
    menu.setCustomId(customId);
    return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)];
  }

  return [];
};

export const recoverDonations = async (clan: APIClan) => {
  const client = container.resolve(Client);

  if (Date.now() >= new Date('2024-05-24T05:00').getTime()) return;

  const inserted = await client.redis.connection.get(`RECOVERY:${clan.tag}`);
  if (inserted) return;

  const { aggregations } = await client.elastic.search({
    query: {
      bool: {
        filter: [
          {
            term: {
              clan_tag: clan.tag
            }
          },
          {
            range: {
              created_at: {
                gte: '2024-04-29T05:00'
              }
            }
          }
        ]
      }
    },
    from: 0,
    size: 0,
    aggs: {
      players: {
        terms: {
          field: 'tag',
          size: 10000
        },
        aggs: {
          donated: {
            filter: {
              term: {
                op: 'DONATED'
              }
            },
            aggs: {
              total: {
                sum: {
                  field: 'value'
                }
              }
            }
          },
          received: {
            filter: {
              term: {
                op: 'RECEIVED'
              }
            },
            aggs: {
              total: {
                sum: {
                  field: 'value'
                }
              }
            }
          }
        }
      }
    }
  });

  const membersMap = clan.memberList.reduce<Record<string, { donated: number; received: number }>>((record, mem) => {
    record[mem.tag] = {
      donated: mem.donations,
      received: mem.donationsReceived
    };
    return record;
  }, {});

  const { buckets } = (aggregations?.players ?? []) as { buckets: AggsBucket[] };
  const playersMap = buckets.reduce<Record<string, { donated: number; received: number }>>((acc, cur) => {
    const member = membersMap[cur.key] ?? { donated: 0, received: 0 };

    acc[cur.key] = {
      donated: Math.max(cur.donated.total.value, member.donated),
      received: Math.max(cur.received.total.value, member.received)
    };

    return acc;
  }, {});

  const tags = Object.keys(playersMap);
  if (!tags.length) return;

  const cursor = client.db
    .collection(Collections.PLAYER_SEASONS)
    .find({ tag: { $in: tags } })
    .project({ tag: 1, clans: 1, _id: 1, season: Season.ID });

  const ops: AnyBulkWriteOperation<PlayerSeasonsEntity>[] = [];
  for await (const player of cursor) {
    if (!player.clans?.[clan.tag]) continue;

    const record = playersMap[player.tag];
    const donations = Math.max(player.clans[clan.tag].donations.total, record.donated);
    const received = Math.max(player.clans[clan.tag].donationsReceived.total, record.received);

    ops.push({
      updateOne: {
        filter: { _id: player._id },
        update: {
          $set: {
            [`clans.${clan.tag}.donations.total`]: donations,
            [`clans.${clan.tag}.donationsReceived.total`]: received
          }
        }
      }
    });
  }

  if (ops.length) {
    await client.db.collection<PlayerSeasonsEntity>(Collections.PLAYER_SEASONS).bulkWrite(ops);
  }

  return client.redis.set(`RECOVERY:${clan.tag}`, '-0-', 60 * 60 * 24 * 3);
};

export const unitsFlatten = (data: APIPlayer) => {
  return [
    ...data.troops.map((u) => ({
      name: u.name,
      level: u.level,
      maxLevel: u.maxLevel,
      type: 'troop',
      village: u.village
    })),
    ...data.heroes.map((u) => ({
      name: u.name,
      level: u.level,
      maxLevel: u.maxLevel,
      type: 'hero',
      village: u.village
    })),
    ...data.spells.map((u) => ({
      name: u.name,
      level: u.level,
      maxLevel: u.maxLevel,
      type: 'spell',
      village: u.village
    })),
    ...data.heroEquipment.map((u) => ({
      name: u.name,
      level: u.level,
      maxLevel: u.maxLevel,
      type: 'equipment',
      village: u.village
    }))
  ];
};

interface AggsBucket {
  key: string;
  doc_count: number;
  donated: {
    total: {
      value: number;
    };
  };
  received: {
    total: {
      value: number;
    };
  };
}
