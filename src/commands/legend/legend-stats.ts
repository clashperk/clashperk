import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  time
} from 'discord.js';
import moment from 'moment';
import { api } from '../../api/axios.js';
import { Command } from '../../lib/handlers.js';
import { createTrophyThresholdsGraph } from '../../struct/image-helper.js';
import { EMOJIS } from '../../util/emojis.js';
import { padEnd, padStart } from '../../util/helper.js';
import { Season } from '../../util/toolkit.js';

const possibleRanks = [
  1, 3, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000
];

export default class LegendStatsCommand extends Command {
  public constructor() {
    super('legend-stats', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { is_eod?: boolean; ranks?: string[]; reference_date?: string }
  ) {
    if (args.reference_date && !moment(args.reference_date).isValid()) {
      return interaction.followUp({
        content: 'Invalid reference date provided.',
        flags: MessageFlags.Ephemeral
      });
    }

    const threshold = await this.getLegendThreshold(!!args.is_eod, args.reference_date);
    if (!threshold?.thresholds?.length) {
      return interaction.followUp({
        content: 'No data available for this date.',
        flags: MessageFlags.Ephemeral
      });
    }

    const container = new ContainerBuilder();
    container.setAccentColor(this.client.embed(interaction)!);
    const text = new TextDisplayBuilder().setContent(
      [
        '## Legend Ranks Threshold',
        '',
        !threshold.isLive
          ? `### End of Day Ranks \n${time(moment(threshold.timestamp).toDate(), 'f')}`
          : `### Live Ranks \n${time(moment().toDate(), 'f')}`,
        '',
        '`   RANK ` `TROPHY` ` DIFF `',
        ...threshold.thresholds.map(({ rank, minTrophies, diff }) => {
          const sign = diff >= 0 ? '+' : '-';
          return `\`${padStart(rank.toLocaleString(), 7)} \` \` ${minTrophies} \` \` ${sign}${padEnd(Math.abs(diff), 4)}\` `;
        })
      ].join('\n')
    );
    container.addTextDisplayComponents(text);

    const customIds = {
      toggle: this.createId({ cmd: this.id, is_eod: !args.is_eod }),
      refresh: this.createId({ cmd: this.id, is_eod: args.is_eod }),
      rank: this.createId({ cmd: this.id, array_key: 'ranks', is_eod: args.is_eod })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(!args.is_eod ? 'End of Day Ranks' : 'Live Ranks')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(customIds.toggle)
    );

    if (!threshold.isLive && args.reference_date) {
      return interaction.editReply({ withComponents: true, components: [container], files: [] });
    }

    if (threshold.isLive) {
      return interaction.editReply({
        withComponents: true,
        components: [container, row],
        files: []
      });
    }

    const minLogs = 3;
    const { startTime } = Season.getSeason();
    const thresholdRecords =
      moment().diff(startTime, 'days') >= minLogs
        ? threshold.history.filter((record) => moment(record.timestamp).isAfter(startTime))
        : threshold.history;

    if (!(thresholdRecords.length >= minLogs)) {
      return interaction.editReply({
        withComponents: true,
        components: [container, row],
        files: []
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(customIds.rank)
      .setPlaceholder('Select Ranks to Compare')
      .setMinValues(0)
      .setMaxValues(possibleRanks.length)
      .setOptions(
        possibleRanks.map((rank) => ({
          label: `#${rank}`,
          value: rank.toString(),
          default: args.ranks?.includes(rank.toString())
        }))
      );

    container.addActionRowComponents((row) => row.addComponents(menu));

    const labels = thresholdRecords.map((record) => record.timestamp);
    const ranksToShow = args.ranks?.length
      ? args.ranks.map(Number)
      : [1, 100, 500, 1000, 5000, 10000, 50000];

    const datasets = ranksToShow.map((rank) => {
      return {
        name: `#${rank}`,
        data: thresholdRecords.map((entry) => {
          const t = entry.thresholds.find((th) => th.rank === rank);
          return t ? t.minTrophies : null;
        })
      };
    });

    const { attachmentKey, file, name } = await createTrophyThresholdsGraph({
      datasets,
      labels,
      title: 'Legend League Ranking Thresholds'
    });
    const rawFile = new AttachmentBuilder(file, { name });

    const media = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder({ media: { url: attachmentKey } })
    );
    container.addMediaGalleryComponents(media);

    // container.addActionRowComponents((row) =>
    //   row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(webLink).setLabel('Open in Web'))
    // );

    return interaction.editReply({
      withComponents: true,
      components: [container, row],
      files: [rawFile]
    });
  }

  private async getLegendThreshold(isEod: boolean, ref?: string) {
    const { data } = await api.legends.getLegendRankingThresholds();

    if (ref && moment(ref).isValid()) {
      const entry = data.history.findIndex((record) =>
        moment(record.timestamp).startOf('day').isSame(moment(ref).startOf('day'), 'day')
      );
      if (!(entry >= 0)) return null;

      const [lastRecord, record] = [data.history[entry - 1], data.history[entry]];
      return { ...this.compare(record, lastRecord), history: data.history, isLive: false };
    }

    if (data.eod && isEod) {
      return {
        ...this.compare(data.eod, data.history.at(-2)),
        history: data.history,
        isLive: false
      };
    }
    if (data.eod && !isEod) {
      return { ...this.compare(data.live, data.eod), history: data.history, isLive: true };
    }

    return null;
  }

  private compare(
    target: LegendRankingThresholdsDto,
    reference?: LegendRankingThresholdsDto | null
  ) {
    const isResetDay =
      reference &&
      Season.getSeason(target.timestamp).seasonId !==
        Season.getSeason(reference.timestamp).seasonId;

    const thresholds = target.thresholds.map((threshold) => {
      const eod =
        reference?.thresholds.find((t) => t.rank === threshold.rank)?.minTrophies ??
        threshold.minTrophies;
      return { ...threshold, diff: threshold.minTrophies - (isResetDay ? 5000 : eod) };
    });
    return { timestamp: target.timestamp, thresholds };
  }
}

interface ThresholdsDto {
  rank: number;
  minTrophies: number;
}

interface LegendRankingThresholdsDto {
  timestamp: string;
  thresholds: ThresholdsDto[];
}
