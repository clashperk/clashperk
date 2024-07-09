import { ButtonInteraction, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { getExportComponents, padStart } from '../../util/__helper.js';
import { Collections } from '../../util/constants.js';
import { Util } from '../../util/index.js';
import { handlePagination } from '../../util/pagination.js';

export default class EosTrophiesHistoryCommand extends Command {
  public constructor() {
    super('eos-trophies-history', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; player_tag?: string; user?: User }) {
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

    if (args.clans) {
      const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
      if (!clans) return;

      const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag).slice(0, 1));
      const playerTags = _clans.flatMap((clan) => clan.memberList.map((member) => member.tag));
      const { embeds, result } = await this.getHistory(interaction, playerTags);
      return handlePagination(interaction, embeds, (action) => this.export(action, result));
    }

    const playerTags = await this.client.resolver.getLinkedPlayerTags(args.user?.id ?? interaction.user.id);
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
            seasons: {
              $push: {
                season: '$season',
                trophies: '$trophies.current'
              }
            }
          }
        }
      ])
      .toArray();

    const embeds: EmbedBuilder[] = [];
    for (const chunk of Util.chunk(result, 15)) {
      const embed = new EmbedBuilder();
      embed.setColor(this.client.embed(interaction));
      embed.setTitle('Season End Trophies (last 12 months)');

      chunk.forEach(({ name, tag, seasons }) => {
        embed.addFields({
          name: `${name} (${tag})`,
          value: [
            '```',
            `\u200eSEASON    TROPHY`,
            seasons
              .map((season) => {
                return `${moment(season.season).format('MMM YYYY')}  ${padStart(season.trophies, 8)}`;
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
        return { name: r.name, tag: r.tag, records: Object.fromEntries(r.seasons.map((r) => [r.season, r.trophies])) };
      })
      .flat();

    const seasonIds = Util.getSeasonIds().slice(0, 12);
    const sheets: CreateGoogleSheet[] = [
      {
        title: `Trophies`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...seasonIds.map((s) => ({ name: s, align: 'RIGHT', width: 100 }))
        ],
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        rows: chunks.map((r) => [r.name, r.tag, ...seasonIds.map((id) => r.records[id] ?? '')])
      }
    ];

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Season End Trophy History]`, sheets);
    return interaction.editReply({
      content: [`**Season End Trophy History**`].join('\n'),
      components: getExportComponents(spreadsheet)
    });
  }
}

interface ISeason {
  season: string;
  trophies: number;
}

interface AggregatedResult {
  name: string;
  tag: string;
  seasons: ISeason[];
}
