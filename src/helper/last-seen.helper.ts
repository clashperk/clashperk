import { Collections } from '@app/constants';
import { APIClan } from 'clashofclans.js';
import { EmbedBuilder } from 'discord.js';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { lastSeenTimestampFormat, padStart } from '../util/helper.js';

export const lastSeenEmbedMaker = async (
  clan: APIClan,
  { color, scoreView }: { color?: number | null; scoreView?: boolean }
) => {
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

  const rows = await client.clickhouse
    .query({
      query: `
        SELECT
          tag,
          count() AS count
        FROM player_activities
        WHERE
          tag in {tags: Array(String)}
          AND createdAt >= {createdAt: DateTime}
        GROUP BY tag
      `,
      query_params: {
        tags: playerTags,
        createdAt: scoreView
          ? Math.floor(new Date().getTime() / 1000) - 30 * 24 * 60 * 60
          : Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60
      }
    })
    .then((res) => res.json<{ tag: string; count: string }>());

  const activityMap = rows.data.reduce<Record<string, number>>((record, item) => {
    record[item.tag] = +item.count;
    return record;
  }, {});

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
  const members = _members
    .filter((m) => m.lastSeen > 0)
    .concat(_members.filter((m) => m.lastSeen === 0));

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
