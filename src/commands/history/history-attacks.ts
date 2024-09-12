import { ButtonInteraction, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { Collections } from '../../util/constants.js';
import { getExportComponents } from '../../util/helper.js';
import { handlePagination } from '../../util/pagination.js';
import { Util } from '../../util/toolkit.js';

export default class AttacksHistoryCommand extends Command {
  public constructor() {
    super('attacks-history', {
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
      .collection(Collections.PLAYER_SEASONS)
      .aggregate<AggregatedResult>([
        { $match: { tag: { $in: playerTags } } },
        {
          $match: {
            createdAt: {
              $gte: moment().startOf('month').subtract(12, 'month').toDate()
            }
          }
        },
        { $sort: { _id: -1 } },
        {
          $group: {
            _id: '$tag',
            name: { $first: '$name' },
            tag: { $first: '$tag' },
            attackWins: { $sum: '$attackWins' },
            defenseWins: { $sum: '$defenseWins' },
            seasonCount: { $sum: 1 },
            seasons: {
              $push: {
                season: '$season',
                attackWins: '$attackWins',
                defenseWins: '$defenseWins'
              }
            }
          }
        },
        {
          $sort: {
            seasonCount: -1
          }
        },
        {
          $sort: {
            attackWins: -1
          }
        }
      ])
      .toArray();

    const embeds: EmbedBuilder[] = [];

    for (const chunk of Util.chunk(result, 15)) {
      const embed = new EmbedBuilder();
      embed.setColor(this.client.embed(interaction));
      embed.setTitle('Attacks History (last 6 months)');

      chunk.forEach(({ name, tag, seasons }) => {
        embed.addFields({
          name: `${name} (${tag})`,
          value: [
            '```',
            `\u200e${'ATK'.padStart(4, ' ')} ${'DEF'.padStart(4, ' ')}    SEASON`,
            seasons
              .map((season) => {
                return `${Util.formatNumber(season.attackWins).padStart(4, ' ')} ${Util.formatNumber(season.defenseWins).padStart(
                  4,
                  ' '
                )}  ${moment(season.season).format('MMM YYYY')}`;
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
        const records = r.seasons.reduce<Record<string, ISeason>>((prev, acc) => {
          prev[acc.season] ??= acc; // eslint-disable-line
          return prev;
        }, {});
        return { name: r.name, tag: r.tag, records };
      })
      .flat();

    const seasonIds = Util.getSeasonIds().slice(0, 12);
    const sheets: CreateGoogleSheet[] = [
      {
        title: `Attacks`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.records[id]?.attackWins ?? 0)])
      },
      {
        title: `Defense`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.records[id]?.defenseWins ?? 0)])
      }
    ];

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Attacks History]`, sheets);
    return interaction.editReply({ content: '**Attacks History**', components: getExportComponents(spreadsheet) });
  }
}

interface ISeason {
  season: string;
  attackWins: number;
  defenseWins: number;
}

interface AggregatedResult {
  name: string;
  tag: string;
  attackWins: number;
  defenseWins: number;
  seasons: ISeason[];
}
