import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { cluster } from 'radash';
import { Command } from '../../lib/handlers.js';
import { padEnd, padStart } from '../../util/helper.js';
import { handlePagination } from '../../util/pagination.js';

export function fromReduced(reduced: Record<string, number>, showFooter = true) {
  const townHalls = Object.entries(reduced)
    .map((arr) => ({ level: Number(arr.at(0)), total: Number(arr.at(1)) }))
    .sort((a, b) => b.level - a.level);

  const total = townHalls.reduce((p, c) => p + c.total, 0);
  const avg = townHalls.reduce((p, c) => p + c.total * c.level, 0) / total || 0;
  const footer = showFooter ? `\`Avg. ${avg.toFixed(2)} (${total}/${50})\`` : '';

  return [
    '\u200e` TH  TOTAL  RATIO `',
    // use \u200e to force left alignment
    townHalls
      .map((th) => {
        const per = (th.total / total) * 100;
        const perStr = Math.round(per) === 0 ? per.toFixed(1) : Math.round(per);
        return `\` ${padStart(th.level, 2)}   ${padEnd(th.total, 5)}  ${padStart(`${perStr}%`, 4)} \``;
      })
      .join('\n'),
    footer
  ].join('\n');
}

export default class SummaryCompoCommand extends Command {
  public constructor() {
    super('summary-compo', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.http._getClans(clans);

    const overall: { tag: string; townHallLevel: number }[] = [];
    const aggregated: { name: string; tag: string; weight: number; compo: Record<string, number> }[] = [];

    for (const clan of _clans) {
      const players = clan.memberList.map((mem) => ({ tag: mem.tag, townHallLevel: mem.townHallLevel }));
      overall.push(...players);

      const reduced = players.reduce<{ [key: string]: number }>((count, member) => {
        const townHall = member.townHallLevel;
        count[townHall] = (count[townHall] || 0) + 1;
        return count;
      }, {});
      const townHalls = Object.entries(reduced)
        .map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
        .sort((a, b) => b.level - a.level);
      const weight = townHalls.reduce((p, c) => p + c.level ** c.total, 0);
      aggregated.push({ name: clan.name, tag: clan.tag, weight, compo: reduced });
    }
    aggregated.sort((a, b) => b.weight - a.weight);

    const embeds = [];
    for (const clans of cluster(aggregated, 20)) {
      const embed = new EmbedBuilder().setTitle('Family TownHall Compo');
      embed.setDescription(clans.map((clan) => `**${clan.name} (${clan.tag})**\n${fromReduced(clan.compo)}`).join('\n\n'));
      embeds.push(embed);
    }

    return handlePagination(interaction, embeds);
  }
}
