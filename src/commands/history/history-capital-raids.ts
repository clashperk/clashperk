import { Collections } from '@app/constants';
import { ButtonInteraction, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';
import { handlePagination } from '../../util/pagination.js';
import { Util } from '../../util/toolkit.js';
import { cluster } from 'radash';

export default class CapitalRaidsHistoryCommand extends Command {
  public constructor() {
    super('capital-raids-history', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; player?: string; user?: User }
  ) {
    if (args.user) {
      const playerTags = await this.client.resolver.getLinkedPlayerTags(args.user.id);
      const { embeds, result } = await this.getHistory(interaction, playerTags);
      if (!result.length) {
        return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
      }
      return handlePagination(interaction, embeds, (action) => this.export(action, result));
    }

    if (args.player) {
      const player = await this.client.resolver.resolvePlayer(interaction, args.player);
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
      .collection(Collections.CAPITAL_RAID_SEASONS)
      .aggregate<AggregatedResult>([
        {
          $match: {
            'members.tag': {
              $in: [...playerTags]
            },
            'createdAt': {
              $gte: moment().startOf('month').subtract(2, 'month').toDate()
            }
          }
        },
        {
          $unwind: {
            path: '$members'
          }
        },
        {
          $match: {
            'members.tag': {
              $in: [...playerTags]
            }
          }
        },
        {
          $sort: {
            _id: -1
          }
        },
        {
          $group: {
            _id: '$members.tag',
            name: {
              $first: '$members.name'
            },
            tag: {
              $first: '$members.tag'
            },
            raids: {
              $push: {
                weekId: '$weekId',
                clan: {
                  name: '$name',
                  tag: '$tag'
                },
                name: '$members.name',
                tag: '$members.tag',
                attacks: '$members.attacks',
                attackLimit: '$members.attackLimit',
                bonusAttackLimit: '$members.bonusAttackLimit',
                capitalResourcesLooted: '$members.capitalResourcesLooted',
                reward: {
                  $sum: [
                    {
                      $multiply: ['$offensiveReward', '$members.attacks']
                    },
                    '$defensiveReward'
                  ]
                }
              }
            }
          }
        }
      ])
      .toArray();
    result.sort((a, b) => b.raids.length - a.raids.length);

    const embeds: EmbedBuilder[] = [];
    for (const chunk of cluster(result, 10)) {
      const embed = new EmbedBuilder();
      embed.setColor(this.client.embed(interaction));
      embed.setTitle('Capital Raid History (last 2 months)');

      chunk.forEach((member) => {
        embed.addFields({
          name: `${member.name} (${member.tag})`,
          value: [
            '```',
            '#  LOOT HIT   WEEK CLAN',
            member.raids
              .slice(0, 9)
              .map((raid, i) => {
                const looted = raid.capitalResourcesLooted.toString().padStart(3, ' ');
                const attacks = `${raid.attacks}/${raid.attackLimit + raid.bonusAttackLimit}`;
                const week = moment(raid.weekId).format('D/MMM').padStart(6, ' ');
                return `${i + 1} ${looted} ${attacks} ${week} \u200e${raid.clan.name}`;
              })
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
        const raids = r.raids.reduce<Record<string, IRaid>>((prev, acc) => {
          prev[acc.weekId] ??= acc;
          return prev;
        }, {});
        return { name: r.name, tag: r.tag, raids };
      })
      .flat();

    const weekendIds = Util.getWeekIds(14);
    const sheets: CreateGoogleSheet[] = [
      {
        title: `Capital Raid History`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...weekendIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [
          r.name,
          r.tag,
          ...weekendIds.map((id) => r.raids[id]?.attacks ?? 0)
        ])
      },
      {
        title: `Capital Loot History`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...weekendIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [
          r.name,
          r.tag,
          ...weekendIds.map((id) => r.raids[id]?.capitalResourcesLooted ?? 0)
        ])
      },
      {
        title: `Capital Medals History`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...weekendIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [
          r.name,
          r.tag,
          ...weekendIds.map((id) => r.raids[id]?.reward ?? 0)
        ])
      }
    ];

    const spreadsheet = await createGoogleSheet(
      `${interaction.guild.name} [Capital Raid History]`,
      sheets
    );
    return interaction.editReply({
      content: '**Capital Raid History**',
      components: getExportComponents(spreadsheet)
    });
  }

  private padding(num: number) {
    return num.toString().padStart(6, ' ');
  }
}

interface IRaid {
  weekId: string;
  clan: {
    name: string;
    tag: string;
  };
  name: string;
  tag: string;
  attacks: number;
  attackLimit: number;
  bonusAttackLimit: number;
  capitalResourcesLooted: number;
  reward: number;
}

interface AggregatedResult {
  name: string;
  tag: string;
  raids: IRaid[];
}
