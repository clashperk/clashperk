import { Collections } from '@app/constants';
import { ButtonInteraction, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';
import { handlePagination } from '../../util/pagination.js';
import { Util } from '../../util/toolkit.js';
import { cluster } from 'radash';

export default class LootHistoryCommand extends Command {
  public constructor() {
    super('loot-history', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; player?: string; user?: User }) {
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
          $set: {
            elixirLoot: {
              $subtract: ['$elixirLoots.current', '$elixirLoots.initial']
            },
            goldLoot: {
              $subtract: ['$goldLoots.current', '$goldLoots.initial']
            },
            darkLoot: {
              $subtract: ['$darkElixirLoots.current', '$darkElixirLoots.initial']
            }
          }
        },
        {
          $set: {
            totalLoot: {
              $sum: ['$elixirLoot', '$goldLoot', '$darkLoot']
            }
          }
        },
        {
          $group: {
            _id: '$tag',
            name: { $first: '$name' },
            tag: { $first: '$tag' },
            seasonCount: { $sum: 1 },
            totalLoot: { $sum: '$totalLoot' },
            attackWins: { $sum: '$attackWins' },
            seasons: {
              $push: {
                season: '$season',
                goldLoot: '$goldLoot',
                elixirLoot: '$elixirLoot',
                darkLoot: '$darkLoot'
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
            totalLoot: -1
          }
        }
      ])
      .toArray();

    const embeds: EmbedBuilder[] = [];

    for (const chunk of cluster(result, 12)) {
      const embed = new EmbedBuilder();
      embed.setColor(this.client.embed(interaction));
      embed.setTitle('Loot History (last 12 months)');

      chunk.forEach(({ name, tag, seasons }) => {
        embed.addFields({
          name: `${name} (${tag})`,
          value: [
            '```',
            `\u200e${'GOLD'.padStart(7, ' ')} ${'ELIXIR'.padStart(7, ' ')} ${'DARK'.padStart(7, ' ')}    SEASON`,
            seasons
              .map((season) => {
                const _gold = Util.formatNumber(season.goldLoot).padStart(7, ' ');
                const _elixir = Util.formatNumber(season.elixirLoot).padStart(7, ' ');
                const _dark = Util.formatNumber(season.darkLoot).padStart(7, ' ');
                return `${_gold} ${_elixir} ${_dark}  ${moment(season.season).format('MMM YYYY')}`;
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
          prev[acc.season] ??= acc;
          return prev;
        }, {});
        return { name: r.name, tag: r.tag, records };
      })
      .flat();

    const seasonIds = Util.getSeasonIds().slice(0, 12);
    const sheets: CreateGoogleSheet[] = [
      {
        title: `Gold`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.records[id]?.darkLoot ?? 0)])
      },
      {
        title: `Elixir`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.records[id]?.elixirLoot ?? 0)])
      },
      {
        title: `Dark`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.records[id]?.darkLoot ?? 0)])
      }
    ];

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Loot History]`, sheets);
    return interaction.editReply({ content: '**Loot History**', components: getExportComponents(spreadsheet) });
  }
}

interface ISeason {
  season: string;
  goldLoot: number;
  elixirLoot: number;
  darkLoot: number;
}

interface AggregatedResult {
  name: string;
  tag: string;
  attackWins: number;
  totalLoot: number;
  seasons: ISeason[];
}
