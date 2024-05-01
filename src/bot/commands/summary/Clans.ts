import { APIClan } from 'clashofclans.js';
import { CommandInteraction, EmbedBuilder, embedLength } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Season, Util } from '../../util/index.js';

export default class SummaryClansCommand extends Command {
  public constructor() {
    super('summary-clans', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const clanList = await this.client.http._getClans(clans);

    clanList.sort((a, b) => a.name.localeCompare(b.name));
    const joinLeaves = await this.getJoinLeave(clanList);

    const texts: string[] = [];
    const allPlayers: { tag: string; townHallLevel: number }[] = [];
    for (const clan of clanList) {
      const players = await this.client.db
        .collection<{ tag: string; townHallLevel: number }>(Collections.PLAYER_SEASONS)
        .find({ season: Season.ID, tag: { $in: clan.memberList.map((mem) => mem.tag) } }, { projection: { tag: 1, townHallLevel: 1 } })
        .toArray();
      allPlayers.push(...players);

      const reduced = players.reduce<{ [key: string]: number }>((count, member) => {
        const townHall = member.townHallLevel;
        count[townHall] = (count[townHall] || 0) + 1;
        return count;
      }, {});
      const townHalls = Object.entries(reduced)
        .map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
        .sort((a, b) => b.level - a.level);
      const avg = townHalls.reduce((p, c) => p + c.total * c.level, 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

      texts.push(
        [
          `\u200e**${clan.name} (${clan.tag})**`,
          '```',
          'TH  |  COUNT',
          townHalls.map((th) => `${th.level.toString().padStart(2, ' ')}  |  ${th.total.toString().padStart(2, ' ')}`).join('\n'),
          `\`\`\` [Total ${clan.members}/50, Avg. ${avg.toFixed(2)}]`,
          '\u200b'
        ].join('\n')
      );
    }

    joinLeaves.sort((a, b) => a.leave - b.leave);
    joinLeaves.sort((a, b) => b.join - a.join);

    const nameLen = Math.max(...clanList.map((clan) => clan.name.length)) + 1;
    const tagLen = Math.max(...clanList.map((clan) => clan.tag.length)) + 1;
    const totalMembers = clanList.reduce((p, c) => p + c.members, 0);

    const embeds: EmbedBuilder[] = [
      new EmbedBuilder()
        .setColor(this.client.embed(interaction))
        .setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
        .setDescription(
          [
            clanList
              .map((clan) => {
                const name = Util.escapeBackTick(clan.name).padEnd(nameLen, ' ');
                return `\`\u200e${name} ${clan.tag.padStart(tagLen, ' ')}  ${clan.members.toString().padStart(2, ' ')}/50 \u200f\``;
              })
              .join('\n')
          ].join('\n')
        )
        .setFooter({ text: `${clans.length} clans, ${totalMembers} members` }),
      new EmbedBuilder()
        .setColor(this.client.embed(interaction))
        .setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
        .setDescription(
          [
            `**Join/Leave History (last 30 days)**`,
            `\`\u200e${'#'.padStart(3, ' ')} ${'JOINED'.padStart(5, ' ')} ${'LEFT'.padStart(5, ' ')}  ${'CLAN'.padEnd(nameLen, ' ')} \``,
            ...joinLeaves.map((clan, i) => {
              const nn = `${i + 1}`.padStart(3, ' ');
              const name = Util.escapeBackTick(clan.name).padEnd(nameLen, ' ');
              return `\`\u200e${nn}  ${this.fmtNum(clan.join)} ${this.fmtNum(clan.leave)}  ${name} \u200f\``;
            })
          ].join('\n')
        )
        .setFooter({ text: `${clans.length} clans, ${totalMembers} members` }),
      new EmbedBuilder()
        .setColor(this.client.embed(interaction))
        .setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
        .setDescription(['**Family Town Hall Compo**', this.compo(allPlayers)].join('\n'))
        .setFooter({ text: `${clans.length} clans, ${totalMembers} members` })
    ];

    if (embeds.reduce((prev, acc) => embedLength(acc.toJSON()) + prev, 0) > 6000) {
      for (const embed of embeds) await interaction.followUp({ embeds: [embed], ephemeral: this.muted });
    }

    return interaction.followUp({ embeds, ephemeral: this.muted });
  }

  private async getJoinLeave(clans: APIClan[]) {
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
				acc[bucket.key] ??= {}; // eslint-disable-line
        acc[bucket.key][key] = doc_count;
        return acc;
      }, {});

    return clans.map((clan) => {
			const join = clanMap[clan.tag]?.JOINED ?? 0; // eslint-disable-line
			const leave = clanMap[clan.tag]?.LEFT ?? 0; // eslint-disable-line
      return { name: clan.name, tag: clan.tag, join, leave };
    });
  }

  private compo(players: { tag: string; townHallLevel: number }[]) {
    const reduced = players.reduce<{ [key: string]: number }>((count, member) => {
      const townHall = member.townHallLevel;
      count[townHall] = (count[townHall] || 0) + 1;
      return count;
    }, {});
    const townHalls = Object.entries(reduced)
      .map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
      .sort((a, b) => b.level - a.level);

    return [
      '```',
      'TH  |  COUNT',
      townHalls.map((th) => `${th.level.toString().padStart(2, ' ')}  |  ${th.total.toString().padEnd(4, ' ')}`).join('\n'),
      '```'
    ].join('\n');
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
