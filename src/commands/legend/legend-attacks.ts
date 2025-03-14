import { ATTACK_COUNTS, Collections, LEGEND_LEAGUE_ID } from '@app/constants';
import { LegendAttacksEntity } from '@app/entities';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown, Guild, User } from 'discord.js';
import moment from 'moment';
import { getLegendTimestampAgainstDay } from '../../helper/legends.helper.js';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { padStart, trimTag } from '../../util/helper.js';
import { Season, Util } from '../../util/toolkit.js';

export default class LegendAttacksCommand extends Command {
  public constructor() {
    super('legend-attacks', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      clans?: string;
      user?: User;
      day?: number;
      /** @deprecated */
      tag?: string;
    }
  ) {
    const resolved = await this.getClans(interaction, args);
    if (!resolved) return;

    const { clans, resolvedArgs } = resolved;
    const seasonId = Season.ID;

    const legendMembers = clans
      .flatMap((clan) => clan.memberList)
      .filter((member) => member.trophies >= 5000 || member.league?.id === LEGEND_LEAGUE_ID);
    const playerTags = legendMembers.map((member) => member.tag);

    const embed = await this.getAttackLog({
      clans,
      guild: interaction.guild,
      leagueDay: args.day,
      legendMembers,
      playerTags,
      seasonId
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(JSON.stringify({ cmd: this.id, clans: resolvedArgs, tag: args.tag }))
    );

    const isCurrentDay = Util.getLegendDay() === getLegendTimestampAgainstDay(args.day).day;
    return interaction.editReply({ embeds: [embed], components: isCurrentDay ? [row] : [] });
  }

  private async getAttackLog({
    seasonId,
    playerTags,
    legendMembers,
    leagueDay,
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
    const result = await this.client.db
      .collection(Collections.LEGEND_ATTACKS)
      .find({ tag: { $in: playerTags }, seasonId })
      .toArray();

    const attackingMembers = result.map((mem) => mem.tag);
    const { startTime, endTime, day } = getLegendTimestampAgainstDay(leagueDay);

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
      const logs = legend.logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
      if (logs.length === 0) continue;

      const attacks = logs.filter((en) => en.type === 'attack');
      const defenses = logs.filter((en) => en.type === 'defense' || (en.type === 'attack' && en.inc === 0)) ?? [];

      const [initial] = logs;
      const [current] = logs.slice(-1);

      const possibleAttackCount = legend.attackLogs?.[moment(endTime).format('YYYY-MM-DD')] ?? 0;
      const possibleDefenseCount = legend.defenseLogs?.[moment(endTime).format('YYYY-MM-DD')] ?? 0;

      const attackCount = Math.max(attacks.length, possibleAttackCount);
      const defenseCount = Math.max(defenses.length, possibleDefenseCount);

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

    const embed = new EmbedBuilder().setColor(this.client.embed(guild.id));

    if (clans.length === 1) {
      const [clan] = clans;
      embed.setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`);
      embed.setURL(`http://cprk.us/c/${trimTag(clan.tag)}`);
    } else {
      embed.setAuthor({ name: `Legend League Attacks (${seasonId})`, iconURL: guild.iconURL()! });
    }

    embed.setDescription(
      [
        clans.length === 1 ? '**Legend League Attacks**' : '',
        `\`GAIN  LOSS  FINAL \` **NAME**`,
        ...members.slice(0, 99).map((mem) => {
          const attacks = padStart(`+${mem.trophiesFromAttacks}${ATTACK_COUNTS[Math.min(8, mem.attackCount)]}`, 5);
          const defense = padStart(`-${Math.abs(mem.trophiesFromDefenses)}${ATTACK_COUNTS[Math.min(8, mem.defenseCount)]}`, 5);
          return `\`${attacks} ${defense}  ${padStart(mem.current.end, 4)} \` \u200e${escapeMarkdown(mem.name)}`;
        })
      ].join('\n')
    );

    const season = this.client.coc.util.getSeason();
    embed.setTimestamp();
    embed.setFooter({ text: `Day ${day}/${moment(season.endTime).diff(season.startTime, 'days')} (${Season.ID})` });

    return embed;
  }

  private async getClans(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; tag?: string; user?: User; location?: string }
  ) {
    const isSingleTag = args.clans && this.client.coc.isValidTag(this.client.coc.fixTag(args.clans));

    if (args.clans && !isSingleTag) {
      const { resolvedArgs, clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
      if (!clans) return;

      const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
      if (_clans.length) return { clans: _clans, resolvedArgs };
    }

    const clan = await this.client.resolver.resolveClan(interaction, args?.clans ?? args.tag ?? args.user?.id);
    if (!clan) return;

    return { clans: [clan], resolvedArgs: null };
  }
}
