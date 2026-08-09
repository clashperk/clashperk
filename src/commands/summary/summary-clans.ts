import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { Util } from '../../util/toolkit.js';
import { fromReduced } from './summary-compo.js';

export default class SummaryClansCommand extends Command {
  public constructor() {
    super('summary-clans', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; display?: string }
  ) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.coc._getClans(clans);
    _clans.sort((a, b) => a.name.localeCompare(b.name));

    if (!_clans.length) {
      return interaction.editReply(
        this.i18n('common.no_clans_found', {
          lng: interaction.locale,
          command: this.client.commands.SETUP_CLAN
        })
      );
    }

    const overall: { tag: string; townHallLevel: number }[] = [];
    for (const clan of _clans) {
      const players = clan.memberList.map((mem) => ({
        tag: mem.tag,
        townHallLevel: mem.townHallLevel
      }));
      overall.push(...players);
    }

    const customIds = {
      joinLeave: this.createId({ cmd: this.id, display: 'join-leave' }),
      clans: this.createId({ cmd: this.id, display: 'clans' })
    };
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(customIds.joinLeave)
        .setLabel('Join/Leave Logs')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(args.display === 'join-leave'),
      new ButtonBuilder()
        .setCustomId(customIds.clans)
        .setLabel('Clans and Town Hall')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(args.display === 'clans' || !args.display)
    );

    const nameLen = Math.max(..._clans.map((clan) => clan.name.length)) + 1;
    const tagLen = Math.max(..._clans.map((clan) => clan.tag.length)) + 1;
    const totalMembers = _clans.reduce((p, c) => p + c.members, 0);

    if (args.display === 'join-leave') {
      const logs = await this.getJoinLeaveLogs(interaction, _clans);
      const embed = new EmbedBuilder()
        .setColor(this.client.embed(interaction))
        .setAuthor({
          name: `${interaction.guild.name} Clans`,
          iconURL: interaction.guild.iconURL()!
        })
        .setDescription(
          [
            `**Join/Leave History (last 30 days)**`,
            `\`\u200e${'#'.padStart(3, ' ')} ${'JOINED'.padStart(5, ' ')} ${'LEFT'.padStart(5, ' ')}  ${'CLAN'.padEnd(nameLen, ' ')} \``,
            ...logs.map((clan, i) => {
              const nn = `${i + 1}`.padStart(3, ' ');
              const name = Util.escapeBackTick(clan.name).padEnd(nameLen, ' ');
              return `\`\u200e${nn}  ${this.fmtNum(clan.join)} ${this.fmtNum(clan.leave)}  ${name} \u200f\``;
            })
          ].join('\n')
        )
        .setFooter({ text: `${clans.length} clans, ${totalMembers} members` });
      return interaction.editReply({ embeds: [embed], components: [row] });
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
      .setDescription(
        [
          _clans
            .map((clan) => {
              const name = Util.escapeBackTick(clan.name).padEnd(nameLen, ' ');
              return `\`\u200e${name} ${clan.tag.padStart(tagLen, ' ')}  ${clan.members.toString().padStart(2, ' ')}/50 \u200f\``;
            })
            .join('\n')
        ].join('\n')
      )
      .addFields({ name: 'Town Hall Levels', value: this.compo(overall) })
      .setFooter({ text: `${clans.length} clans, ${totalMembers} members` });

    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async getJoinLeaveLogs(interaction: CommandInteraction<'cached'>, clans: APIClan[]) {
    const rows = await this.client.clickhouse
      .query({
        query: `
          SELECT
            clanTag,
            action,
            COUNT(*) AS count
          FROM player_activities
          WHERE
            clanTag IN {clanTags: Array(String)}
            AND action IN ('JOINED_CLAN', 'LEFT_CLAN')
            AND createdAt >= now() - INTERVAL 30 DAY
          GROUP BY clanTag, action
        `,
        query_params: {
          clanTags: clans.map((clan) => clan.tag)
        }
      })
      .then((res) => res.json<{ clanTag: string; action: string; count: string }>());

    const clanMap: Record<string, Record<string, number>> = {};
    for (const row of rows.data) {
      clanMap[row.clanTag] ??= {};
      clanMap[row.clanTag][row.action] = Number(row.count);
    }

    const logs = clans.map((clan) => {
      const join = clanMap[clan.tag]?.JOINED_CLAN ?? 0;
      const leave = clanMap[clan.tag]?.LEFT_CLAN ?? 0;
      return { name: clan.name, tag: clan.tag, join, leave };
    });

    logs.sort((a, b) => b.leave - a.leave);
    logs.sort((a, b) => b.join - a.join);

    return logs;
  }

  private compo(players: { tag: string; townHallLevel: number }[]) {
    const reduced = players.reduce<{ [key: string]: number }>((count, member) => {
      const townHall = member.townHallLevel;
      count[townHall] = (count[townHall] || 0) + 1;
      return count;
    }, {});

    return fromReduced(reduced, false);
  }

  private fmtNum(num: number) {
    const numString = num > 999 ? `${(num / 1000).toFixed(1)}K` : num.toString();
    return numString.padStart(5, ' ');
  }
}
