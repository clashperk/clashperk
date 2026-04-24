import { ATTACK_COUNTS, LEGEND_LEAGUE_ID } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  escapeMarkdown,
  Guild,
  User
} from 'discord.js';
import moment from 'moment';
import { BattleLogDto } from '../../api/generated.js';
import { getLegendBattleLog, getLegendTimestampAgainstDay } from '../../helper/legends.helper.js';
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
    }
  ) {
    const resolved = await this.getClans(interaction, args);
    if (!resolved) return;

    const { clans, resolvedArgs } = resolved;
    const legendMembers = clans
      .flatMap((clan) => clan.memberList)
      .filter(
        (member) =>
          member.trophies >= 5000 || (member.leagueTier && member.leagueTier.id >= LEGEND_LEAGUE_ID)
      );
    const playerTags = legendMembers.map((member) => member.tag);

    const embed = await this.getAttackLog({
      clans,
      guild: interaction.guild,
      leagueDay: args.day,
      playerTags
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(this.createId({ cmd: this.id, clans: resolvedArgs }))
    );

    const isCurrentDay = Util.getLegendDay() === getLegendTimestampAgainstDay(args.day).day;
    return interaction.editReply({ embeds: [embed], components: isCurrentDay ? [row] : [] });
  }

  private async getAttackLog({
    playerTags,
    leagueDay,
    clans,
    guild
  }: {
    playerTags: string[];
    leagueDay?: number;
    clans: { tag: string; name: string }[];
    guild: Guild;
  }) {
    const { startTime, day } = getLegendTimestampAgainstDay(leagueDay);
    const battleDate = new Date(startTime).toISOString().slice(0, 10);

    const battleLogResults = await Promise.all(
      playerTags.map((tag) => getLegendBattleLog(tag).catch(() => [] as BattleLogDto[]))
    );
    const logsByTag = new Map<string, BattleLogDto[]>(
      playerTags.map((tag, i) => [tag, battleLogResults[i]])
    );

    const members = [];
    for (const [tag, battles] of logsByTag) {
      const dayBattles = battles.filter((b) => b.battleDate === battleDate);
      if (!dayBattles.length) continue;

      const attacks = dayBattles.filter((b) => b.isAttack && b.trophyChange > 0);
      const defenses = dayBattles.filter((b) => !b.isAttack || b.trophyChange <= 0);

      const trophiesFromAttacks = attacks.reduce((acc, b) => acc + b.trophyChange, 0);
      const trophiesFromDefenses = defenses.reduce((acc, b) => acc + b.trophyChange, 0);
      const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

      const lastBattle = dayBattles.at(0)!;
      const currentTrophies = lastBattle.trophies;

      members.push({
        name: lastBattle.name,
        tag,
        attacks,
        defenses,
        attackCount: attacks.length,
        defenseCount: defenses.length,
        trophiesFromAttacks,
        trophiesFromDefenses,
        netTrophies,
        currentTrophies
      });
    }
    members.sort((a, b) => b.currentTrophies - a.currentTrophies);

    const embed = new EmbedBuilder().setColor(this.client.embed(guild.id));

    if (clans.length === 1) {
      const [clan] = clans;
      embed.setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`);
      embed.setURL(`http://cprk.us/c/${trimTag(clan.tag)}`);
    } else {
      embed.setAuthor({ name: `Legend League Attacks (${Season.ID})`, iconURL: guild.iconURL()! });
    }

    embed.setDescription(
      [
        clans.length === 1 ? '**Legend League Attacks**' : '',
        `\`GAIN  LOSS  FINAL \` **NAME**`,
        ...members.slice(0, 99).map((mem) => {
          const attacks = padStart(
            `+${mem.trophiesFromAttacks}${ATTACK_COUNTS[Math.min(8, mem.attackCount)]}`,
            5
          );
          const defense = padStart(
            `-${Math.abs(mem.trophiesFromDefenses)}${ATTACK_COUNTS[Math.min(8, mem.defenseCount)]}`,
            5
          );
          return `\`${attacks} ${defense}  ${padStart(mem.currentTrophies, 4)} \` \u200e${escapeMarkdown(mem.name)}`;
        })
      ].join('\n')
    );

    const season = Season.getSeason();
    embed.setTimestamp();
    embed.setFooter({
      text: `Day ${day}/${moment(season.endTime).diff(season.startTime, 'days')} (${Season.ID})`
    });

    return embed;
  }

  private async getClans(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; user?: User }
  ) {
    const isSingleTag =
      args.clans && this.client.coc.isValidTag(this.client.coc.fixTag(args.clans));

    if (args.clans && !isSingleTag) {
      const { resolvedArgs, clans } = await this.client.storage.handleSearch(interaction, {
        args: args.clans
      });
      if (!clans) return;

      const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
      if (_clans.length) return { clans: _clans, resolvedArgs };
    }

    const clan = await this.client.resolver.resolveClan(interaction, args?.clans ?? args.user?.id);
    if (!clan) return;

    return { clans: [clan], resolvedArgs: clan.tag };
  }
}
