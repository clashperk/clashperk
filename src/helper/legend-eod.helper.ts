import { Collections } from '@app/constants';
import { LegendAttacksEntity } from '@app/entities';
import { EmbedBuilder, escapeMarkdown, Guild, time } from 'discord.js';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { Season, Util } from '../util/toolkit.js';

export async function getEodAttacksEmbedMaker({
  seasonId,
  playerTags,
  legendMembers,
  clans,
  guild
}: {
  seasonId: string;
  playerTags: string[];
  legendMembers: { name: string; tag: string; trophies: number }[];
  leagueDay?: number;
  clans: { tag: string; name: string }[];
  guild: Guild;
}) {
  const client = container.resolve(Client);

  const result = await client.db
    .collection(Collections.LEGEND_ATTACKS)
    .find({ tag: { $in: playerTags }, seasonId })
    .toArray();

  const attackingMembers = result.map((mem) => mem.tag);
  const { startTime, endTime, day } = getEodDay();

  const clanMembers: LegendAttacksEntity[] = legendMembers
    .filter((mem) => !attackingMembers.includes(mem.tag))
    .map((mem) => ({
      name: mem.name,
      tag: mem.tag,
      streak: 0,
      logs: [
        {
          timestamp: startTime,
          start: mem.trophies,
          inc: 0,
          end: mem.trophies,
          type: 'hold'
        }
      ],

      // not confirmed
      initial: mem.trophies,
      seasonId,
      trophies: mem.trophies,
      attackLogs: {},
      defenseLogs: {}
    }));

  const members = [];
  for (const legend of [...result, ...clanMembers]) {
    const logs = legend.logs.filter(
      (atk) => atk.timestamp >= startTime && atk.timestamp <= endTime
    );
    if (logs.length === 0) continue;

    const [current] = logs.slice(-1);

    members.push({
      name: legend.name,
      tag: legend.tag,
      current
    });
  }
  members.sort((a, b) => b.current.end - a.current.end);

  const embed = new EmbedBuilder().setColor(client.embed(guild.id));

  if (clans.length === 1) {
    const [clan] = clans;
    embed.setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`);
    embed.setURL(
      `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`
    );
  } else {
    embed.setAuthor({ name: `Legend League Attacks (${seasonId})`, iconURL: guild.iconURL()! });
  }

  embed.setDescription(
    [
      clans.length === 1 ? '**Legend League Attacks**' : '',
      `\` START\`  \`  END \` **NAME**`,
      ...members.slice(0, 50).map((mem) => {
        return `\` ${mem.current.start} \` \` ${mem.current.end} \` \u200e${escapeMarkdown(mem.name)}`;
      }),
      `${time(new Date(startTime), 'f')} - ${time(new Date(endTime), 'f')}`
    ].join('\n')
  );

  embed.setFooter({ text: `Day ${day} (${Season.ID})` });
  return { embed, players: members };
}

export function getEodDay() {
  const day = Util.getLegendDay() - 1;
  const days = Util.getLegendDays();
  const num = Math.min(days.length, Math.max(day, 1));
  return { ...days[num - 1], day };
}
