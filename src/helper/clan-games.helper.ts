import { APIClan } from 'clashofclans.js';
import { EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../util/emojis.js';
import { clanGamesMaxPoints, padStart } from '../util/helper.js';

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
