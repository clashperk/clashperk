import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { formatLeague, leagueTierSort, padStart } from '../../util/helper.js';

export default class SummaryTrophiesCommand extends Command {
  public constructor() {
    super('summary-trophies', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { limit?: number; clans?: string; clans_only?: boolean; builder_base?: boolean }
  ) {
    let limit = 99;
    if (args.limit) limit = Math.max(5, Math.min(99, args.limit));

    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
    const members = _clans
      .map((clan) => clan.memberList.map((mem) => ({ clan: clan.name, name: mem.name, tag: mem.tag, trophies: mem.trophies })))
      .flat();

    if (!members.length) {
      return interaction.editReply({ content: 'No players found in your clans. Try again later!' });
    }

    const grouped = Object.values(
      _clans.reduce<Record<string, ClansGroup>>((acc, clan) => {
        acc[clan.tag] = {
          name: clan.name,
          tag: clan.tag,
          maxTrophies: Math.max(...clan.memberList.map((mem) => mem.trophies)),
          4000: clan.memberList.filter((mem) => mem.trophies >= 4000).length,
          4800: clan.memberList.filter((mem) => mem.trophies >= 4800).length,
          5100: clan.memberList.filter((mem) => mem.trophies >= 5100).length,
          5200: clan.memberList.filter((mem) => mem.trophies >= 5200).length,
          5000: clan.memberList.filter((mem) => mem.trophies >= 5000).length,
          5500: clan.memberList.filter((mem) => mem.trophies >= 5500).length,
          5800: clan.memberList.filter((mem) => mem.trophies >= 5800).length,
          6000: clan.memberList.filter((mem) => mem.trophies >= 6000).length,
          clanPoints: args.builder_base ? clan.clanBuilderBasePoints : clan.clanPoints,
          totalTrophies: clan.memberList.reduce((prev, mem) => prev + mem.trophies, 0)
        };
        return acc;
      }, {})
    );

    grouped.sort((a, b) => b.clanPoints - a.clanPoints);
    const memberTags = members.map((member) => member.tag);
    const maxTrophies = Math.max(...grouped.map((clan) => clan.maxTrophies));

    const embed = new EmbedBuilder().setColor(this.client.embed(interaction)).setTimestamp();
    if (args.clans_only) {
      const label =
        maxTrophies >= 6000
          ? '5K 5.5 6K'
          : maxTrophies >= 5800
            ? '5K 5.5 5.8'
            : maxTrophies >= 5500
              ? '5K 5.2 5.5'
              : maxTrophies >= 5200
                ? '5K 5.1 5.2'
                : '4K 4.8 5K';

      embed.setDescription(
        [
          '```',
          `\u200e # ${label} ${'POINTS'.padStart(6, ' ')} NAME`,
          grouped
            .map((clan, index) => {
              const _4000 = `${padStart(clan['4000'], 2)}`;
              const _4800 = `${padStart(clan['4800'], 3)}`;
              const _5000 = `${padStart(clan['5000'], 2)}`;
              const _5100 = `${padStart(clan['5100'], 3)}`;
              const _5200 = `${padStart(clan['5200'], 3)}`;
              const _5500 = `${padStart(clan['5500'], 3)}`;
              const _5800 = `${padStart(clan['5800'], 3)}`;
              const _6000 = `${padStart(clan['6000'], 2)}`;

              const clanPoints = `${padStart(clan.clanPoints, 6)}`;
              const stats =
                maxTrophies >= 6000
                  ? `${_5000} ${_5500} ${_6000}`
                  : maxTrophies >= 5800
                    ? `${_5000} ${_5500} ${_5800}`
                    : maxTrophies >= 5500
                      ? `${_5000} ${_5200} ${_5500}`
                      : maxTrophies >= 5200
                        ? `${_5000} ${_5100} ${_5200}`
                        : `${_4000} ${_4800} ${_5000}`;

              return `${padStart(index + 1, 2)} ${stats} ${clanPoints} \u200e${escapeMarkdown(clan.name)}`;
            })
            .join('\n'),
          '```'
        ].join('\n')
      );

      if (args.builder_base) {
        embed.setAuthor({ name: `${interaction.guild.name} Best Builder Base Trophies` });
        embed.setDescription(
          [
            '```',
            `\u200e # ${'POINTS'.padStart(6, ' ')} NAME`,
            grouped
              .map((clan, index) => {
                const clanPoints = `${clan.clanPoints.toString().padStart(6, ' ')}`;
                return `${(index + 1).toString().padStart(2, ' ')} ${clanPoints} \u200e${escapeMarkdown(clan.name)}`;
              })
              .join('\n'),
            '```'
          ].join('\n')
        );
      }
    } else if (args.builder_base) {
      const players = await this.client.redis.getPlayers(memberTags);
      players.sort((a, b) => (b.builderBaseTrophies || 0) - (a.builderBaseTrophies || 0));

      embed.setDescription(
        [
          `\`\u200e # TROPHY     LEAGUE \`  ${'NAME'}`,
          ...players.slice(0, limit).map((member, index) => {
            const trophies = padStart(member.builderBaseTrophies || 0, 4);
            const league = padStart(formatLeague(member.builderBaseLeague?.name || 'Unranked'), 12);
            return `\`${padStart(index + 1, 2)}  ${trophies} ${league} \`  \u200e${escapeMarkdown(member.name)}`;
          })
        ].join('\n')
      );

      embed.setAuthor({ name: 'Builder Base Trophies Leaderboard' });
    } else {
      const players = await this.client.redis.getPlayers(memberTags);
      players.sort((a, b) => b.trophies - a.trophies);
      players.sort((a, b) => leagueTierSort(a.leagueTier, b.leagueTier));

      embed.setDescription(
        [
          `\`\u200e # TROPHY     LEAGUE \`  ${'NAME'}`,
          ...players.slice(0, limit).map((member, index) => {
            const trophies = padStart(member.trophies, 4);
            const league = padStart(formatLeague(member.leagueTier?.name || 'Unranked'), 11);
            return `\`${padStart(index + 1, 2)}  ${trophies} ${league} \`  \u200e${escapeMarkdown(member.name)}`;
          })
        ].join('\n')
      );

      embed.setAuthor({ name: 'Trophies Leaderboard' });
    }

    const payload = {
      cmd: this.id,
      clans: resolvedArgs,
      limit: args.limit,
      clans_only: args.clans_only,
      builder_base: args.builder_base
    };

    const customIds = {
      refresh: this.createId(payload),
      toggle: this.createId({ ...payload, clans_only: !args.clans_only }),
      village: this.createId({ ...payload, builder_base: !args.builder_base })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(args.clans_only ? 'Players Summary' : 'Clans Summary')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(customIds.toggle),
      new ButtonBuilder()
        .setLabel(args.builder_base ? 'Home Village' : 'Builder Base')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(customIds.village)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private pad(num: string | number, padding = 2) {
    return String(num).padStart(padding, ' ');
  }
}

interface ClansGroup {
  clanPoints: number;
  totalTrophies: number;
  name: string;
  tag: string;
  4000: number;
  4800: number;
  5000: number;
  5100: number;
  5200: number;
  5500: number;
  5800: number;
  6000: number;
  maxTrophies: number;
}
