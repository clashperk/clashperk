import { APIClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
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

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; display?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.coc._getClans(clans);
    _clans.sort((a, b) => a.name.localeCompare(b.name));

    const overall: { tag: string; townHallLevel: number }[] = [];
    for (const clan of _clans) {
      const players = clan.memberList.map((mem) => ({ tag: mem.tag, townHallLevel: mem.townHallLevel }));
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
        .setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
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
    const gte = moment().subtract(1, 'month').toDate().toISOString();
    const { aggregations } = await this.client.elastic.search({
      index: 'join_leave_events',
      query: {
        bool: {
          filter: [{ terms: { clan_tag: clans.map((clan) => clan.tag) } }, { range: { created_at: { gte } } }]
        }
      },
      size: 0,
      sort: [{ created_at: { order: 'desc' } }],
      aggs: {
        clans: {
          terms: {
            field: 'clan_tag',
            size: Math.min(10_000)
          },
          aggs: {
            events: {
              terms: {
                field: 'op'
              }
            }
          }
        }
      }
    });

    const { buckets } = (aggregations?.clans ?? []) as { buckets: AggsBucket[] };
    const clanMap = buckets
      .flatMap((bucket) => bucket.events.buckets.map(({ doc_count, key }) => ({ bucket, doc_count, key })))
      .reduce<Record<string, Record<string, number>>>((acc, { bucket, doc_count, key }) => {
        acc[bucket.key] ??= {};
        acc[bucket.key][key] = doc_count;
        return acc;
      }, {});

    const logs = clans.map((clan) => {
      const join = clanMap[clan.tag]?.JOINED ?? 0;
      const leave = clanMap[clan.tag]?.LEFT ?? 0;
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

interface AggsBucket {
  key: string;
  doc_count: number;
  events: {
    buckets: {
      key: string;
      doc_count: number;
    }[];
  };
}
