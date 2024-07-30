import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown, User } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { LegendAttacks } from '../../types/index.js';
import { ATTACK_COUNTS, Collections, LEGEND_LEAGUE_ID } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';
import { Season, Util } from '../../util/index.js';

export default class LegendAttacksCommand extends Command {
  public constructor() {
    super('legend-attacks', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public args(): Args {
    return {
      clan_tag: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  private getDay(day?: number) {
    if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };
    const days = Util.getLegendDays();
    const num = Math.min(days.length, Math.max(day, 1));
    return { ...days[num - 1], day };
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User; day?: number }) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const seasonId = Season.ID;
    const result = await this.client.db
      .collection<LegendAttacks>(Collections.LEGEND_ATTACKS)
      .find({
        tag: {
          $in: clan.memberList.map((mem) => mem.tag)
        },
        seasonId
      })
      .toArray();

    const attackingMembers = result.map((mem) => mem.tag);
    const { startTime, endTime, day } = this.getDay(args.day);

    const clanMembers = clan.memberList
      .filter((mem) => !attackingMembers.includes(mem.tag) && (mem.league?.id === LEGEND_LEAGUE_ID || mem.trophies >= 5000))
      .map(
        (mem) =>
          ({
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
            ]
          }) satisfies LegendAttacks
      );

    const members = [];
    for (const legend of [...result, ...clanMembers]) {
      const logs = legend.logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
      if (logs.length === 0) continue;

      const attacks = logs.filter((en) => en.type === 'attack' || en.inc > 0);
      const defenses = logs.filter((en) => (en.type === 'defense' || en.inc <= 0) && en.type !== 'hold');

      const [initial] = logs;
      const [current] = logs.slice(-1);

      const attackCount = Math.min(attacks.length);
      const defenseCount = Math.min(defenses.length);

      const trophiesFromAttacks = attacks.reduce((acc, cur) => acc + cur.inc, 0);
      const trophiesFromDefenses = defenses.reduce((acc, cur) => acc + cur.inc, 0);

      const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

      members.push({
        name: legend.name,
        tag: legend.tag,
        attacks,
        defenses,
        attackCount,
        defenseCount,
        trophiesFromAttacks,
        trophiesFromDefenses,
        netTrophies,
        initial,
        current
      });
    }
    members.sort((a, b) => b.current.end - a.current.end);

    const embed = new EmbedBuilder()
      .setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`)
      .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
      .setColor(this.client.embed(interaction));

    embed.setDescription(
      [
        '**Legend League Attacks**',
        '```',
        '\u200e GAIN  LOSS FINAL NAME',
        ...members.map(
          (mem) =>
            `\u200e${this.pad(`+${mem.trophiesFromAttacks}${ATTACK_COUNTS[Math.min(9, mem.attackCount)]}`, 5)} ${this.pad(
              `-${Math.abs(mem.trophiesFromDefenses)}${ATTACK_COUNTS[Math.min(9, mem.defenseCount)]}`,
              5
            )}  ${this.pad(mem.current.end)} ${escapeMarkdown(mem.name)}`
        ),
        '```'
      ].join('\n')
    );

    embed.setFooter({ text: `Day ${day} (${Season.ID})` });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(JSON.stringify({ cmd: this.id, tag: args.tag }))
    );
    const currDay = Util.getLegendDay();
    return interaction.editReply({ embeds: [embed], components: currDay === day ? [row] : [] });
  }

  private pad(num: number | string, padding = 4) {
    return num.toString().padStart(padding, ' ');
  }
}
