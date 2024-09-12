import { ButtonInteraction, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { Collections } from '../../util/constants.js';
import { getExportComponents } from '../../util/helper.js';
import { handlePagination } from '../../util/pagination.js';
import { Util } from '../../util/toolkit.js';

export default class CapitalContributionHistoryCommand extends Command {
  public constructor() {
    super('capital-contribution-history', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; player_tag?: string; user?: User }) {
    if (args.user) {
      const playerTags = await this.client.resolver.getLinkedPlayerTags(args.user.id);
      const { embeds, result } = await this.getHistory(interaction, playerTags);
      if (!result.length) {
        return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
      }

      return handlePagination(interaction, embeds, (action) => this.export(action, result));
    }

    if (args.player_tag) {
      const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
      if (!player) return null;
      const playerTags = [player.tag];
      const { embeds, result } = await this.getHistory(interaction, playerTags);
      if (!result.length) {
        return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
      }

      return handlePagination(interaction, embeds, (action) => this.export(action, result));
    }

    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
    const playerTags = _clans.flatMap((clan) => clan.memberList.map((member) => member.tag));
    const { embeds, result } = await this.getHistory(interaction, playerTags);
    if (!result.length) {
      return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
    }

    return handlePagination(interaction, embeds, (action) => this.export(action, result));
  }

  private async getHistory(interaction: CommandInteraction<'cached'>, playerTags: string[]) {
    const result = await this.client.db
      .collection(Collections.CAPITAL_CONTRIBUTIONS)
      .aggregate<{ name: string; tag: string; weeks: { week: string; total: number }[] }>([
        {
          $match: {
            tag: {
              $in: [...playerTags]
            },
            createdAt: {
              $gte: moment().startOf('month').subtract(3, 'month').toDate()
            }
          }
        },
        {
          $set: {
            week: {
              $dateTrunc: {
                date: '$createdAt',
                unit: 'week',
                startOfWeek: 'monday'
              }
            }
          }
        },
        {
          $addFields: {
            total: {
              $subtract: ['$current', '$initial']
            }
          }
        },
        {
          $group: {
            _id: {
              week: '$week',
              tag: '$tag'
            },
            week: {
              $first: '$week'
            },
            name: {
              $first: '$name'
            },
            tag: {
              $first: '$tag'
            },
            total: {
              $sum: '$total'
            }
          }
        },
        {
          $sort: {
            week: -1
          }
        },
        {
          $group: {
            _id: '$tag',
            name: {
              $first: '$name'
            },
            tag: {
              $first: '$tag'
            },
            total: {
              $sum: '$total'
            },
            weeks: {
              $push: {
                week: '$week',
                total: '$total'
              }
            }
          }
        },
        {
          $sort: {
            total: -1
          }
        }
      ])
      .toArray();

    result.sort((a, b) => b.weeks.length - a.weeks.length);

    const embeds: EmbedBuilder[] = [];
    for (const chunk of Util.chunk(result, 15)) {
      const embed = new EmbedBuilder();
      embed.setColor(this.client.embed(interaction));
      embed.setTitle('Capital Contribution History (last 3 months)');

      chunk.forEach(({ name, tag, weeks }) => {
        embed.addFields({
          name: `${name} (${tag})`,
          value: [
            '```',
            '\u200e #   LOOT   WEEKEND',
            weeks
              .slice(0, 14)
              .map(
                (week, i) =>
                  `\u200e${(i + 1).toString().padStart(2, ' ')}  ${this.padding(week.total)}  ${moment(week.week)
                    .format('D MMM')
                    .padStart(7, ' ')}`
              )
              .join('\n'),
            '```'
          ].join('\n')
        });
      });

      embeds.push(embed);
    }

    return { embeds, result };
  }

  private async export(interaction: ButtonInteraction<'cached'>, result: AggregatedResult[]) {
    const chunks = result
      .map((r) => {
        const records = r.weeks.reduce<Record<string, IWeek>>((prev, acc) => {
          const weekId = moment(acc.week).format('YYYY-MM-DD');
          prev[weekId] ??= acc; // eslint-disable-line
          return prev;
        }, {});
        return { name: r.name, tag: r.tag, records };
      })
      .flat();

    const weekendIds = Util.getWeekIds(14).map((id) => moment(id).add(3, 'day').format('YYYY-MM-DD'));
    const sheets: CreateGoogleSheet[] = [
      {
        title: `Capital Donations History`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...weekendIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        rows: chunks.map((r) => [r.name, r.tag, ...weekendIds.map((id) => r.records[id]?.total ?? 0)])
      }
    ];

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Capital Contribution History]`, sheets);
    return interaction.editReply({ content: '**Capital Contribution History**', components: getExportComponents(spreadsheet) });
  }

  private padding(num: number) {
    return num.toString().padStart(6, ' ');
  }
}

interface IWeek {
  week: string;
  total: number;
}

interface AggregatedResult {
  name: string;
  tag: string;
  weeks: IWeek[];
}
