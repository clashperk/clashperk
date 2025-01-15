import { CommandInteraction, EmbedBuilder, escapeMarkdown, time } from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import { Command } from '../../lib/handlers.js';
import { padStart } from '../../util/helper.js';
import { Season } from '../../util/toolkit.js';

export default class DonationsCommand extends Command {
  public constructor() {
    super('donations-range', {
      category: 'activity',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      tag: string;
      start_date?: string;
      end_date?: string;
    }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag);
    if (!clan) return;

    if (args.start_date) args.start_date = moment(args.start_date).toISOString();
    if (args.end_date) args.end_date = moment(args.end_date).toISOString();

    args.end_date ??= moment().toISOString();
    args.start_date ??= moment(Season.ID).toISOString();

    if (moment(args.end_date).diff(moment(args.start_date), 'months') > 6) {
      return interaction.editReply('The date range cannot exceed 6 months.');
    }

    const { aggregations } = await this.client.elastic.search({
      index: 'donation_events',
      size: 0,
      from: 0,
      query: {
        bool: {
          filter: [
            {
              term: {
                clan_tag: clan.tag
              }
            },
            {
              terms: {
                tag: clan.memberList.map((member) => member.tag)
              }
            },
            {
              range: {
                created_at: {
                  gte: args.start_date,
                  lte: args.end_date
                }
              }
            }
          ]
        }
      },
      aggs: {
        players: {
          terms: {
            field: 'tag',
            size: 50
          },
          aggs: {
            donated: {
              filter: { term: { op: 'DONATED' } },
              aggs: {
                total: {
                  sum: {
                    field: 'value'
                  }
                }
              }
            },
            received: {
              filter: { term: { op: 'RECEIVED' } },
              aggs: {
                total: {
                  sum: {
                    field: 'value'
                  }
                }
              }
            }
          }
        }
      }
    });

    const { buckets } = (aggregations?.players ?? []) as { buckets: AggsBucket[] };
    if (!buckets.length) {
      return interaction.editReply('No donation data found for the specified date range.');
    }

    const playersMap = buckets.reduce<Record<string, { donated: number; received: number }>>((acc, cur) => {
      acc[cur.key] = {
        donated: cur.donated.total.value,
        received: cur.received.total.value
      };
      return acc;
    }, {});

    const result = clan.memberList.map((player) => ({
      name: player.name,
      tag: player.tag,
      donated: playersMap[player.tag]?.donated ?? 0,
      received: playersMap[player.tag]?.received ?? 0
    }));

    result.sort((a, b) => b.received - a.received);
    result.sort((a, b) => b.donated - a.donated);

    const maxDonations = Math.max(...result.map((player) => player.donated)).toString().length;
    const maxReceived = Math.max(...result.map((player) => player.received)).toString().length;

    const startTime = moment(args.start_date).toDate();
    const endTime = moment(args.end_date).toDate();

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.large })
      .setColor(this.client.embed(interaction))
      .setDescription(
        [
          `**Donations by Date Range (${ms(endTime.getTime() - startTime.getTime(), { long: true })})**`,
          `${time(startTime)} - ${time(endTime)}`,
          '',
          ...result.map((player) => {
            const don = padStart(player.donated, maxDonations);
            const rec = padStart(player.received, maxReceived);
            const name = escapeMarkdown(player.name);
            return `\` ${don}  ${rec} \` \u200e${name}`;
          })
        ].join('\n')
      );
    const donated = result.reduce((acc, cur) => acc + cur.donated, 0);
    const received = result.reduce((acc, cur) => acc + cur.received, 0);
    embed.setFooter({ text: `[${donated} DON | ${received} REC]` });
    embed.setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}

interface AggsBucket {
  key: string;
  doc_count: number;
  donated: {
    total: {
      value: number;
    };
  };
  received: {
    total: {
      value: number;
    };
  };
}
