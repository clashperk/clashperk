import {
  ActionRowBuilder,
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
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { padEnd, padStart } from '../../util/helper.js';

const solidColors = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4'];
const colors = [
  '#FF6384', // Rose Red
  '#36A2EB', // Sky Blue
  '#FFCE56', // Sunshine Yellow
  '#4BC0C0', // Seafoam Teal
  '#9966FF', // Lavender Purple
  '#FF9F40', // Vivid Orange
  '#00ADEF', // Bright Cyan
  '#FF6B6B', // Soft Coral
  '#7FDBFF', // Pastel Sky
  '#B28DFF', // Light Violet
  '#2ED9C3', // Fresh Teal
  '#FFD166', // Golden Peach
  '#C56CF0', // Dreamy Purple
  '#F6707B', // Coral Pink
  '#57D9A3' // Mint Green
];
const possibleRanks = [1, 3, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

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
      return interaction.followUp({ content: 'Invalid reference date provided.', flags: MessageFlags.Ephemeral });
    }

    const threshold = await this.getLegendThreshold(!!args.is_eod, args.reference_date);
    if (!threshold?.thresholds?.length) {
      return interaction.followUp({ content: 'No data available for this date.', flags: MessageFlags.Ephemeral });
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
        '`  RANK ` `TROPHY` ` DIFF `',
        ...threshold.thresholds.map(({ rank, minTrophies, diff }) => {
          if (threshold.hasDiff) {
            const sign = diff >= 0 ? '+' : '-';
            return `\`${padStart(rank.toLocaleString(), 6)} \` \` ${minTrophies} \` \` ${sign}${padEnd(Math.abs(diff), 4)}\` `;
          }
          return `\`${padStart(rank.toLocaleString(), 6)} \` \` ${minTrophies} \``;
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
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(!args.is_eod ? 'End of Day Ranks' : 'Live Ranks')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(customIds.toggle)
    );

    if (!threshold.isLive && args.reference_date) {
      return interaction.editReply({ withComponents: true, components: [container] });
    }

    if (threshold.isLive) {
      return interaction.editReply({ withComponents: true, components: [container, row] });
    }

    if (threshold.history.length < 3) return;

    const menu = new StringSelectMenuBuilder()
      .setCustomId(customIds.rank)
      .setPlaceholder('Select Ranks to Compare')
      .setMinValues(0)
      .setMaxValues(possibleRanks.length)
      .setOptions(
        possibleRanks.map((rank) => ({ label: `#${rank}`, value: rank.toString(), default: args.ranks?.includes(rank.toString()) }))
      );

    container.addActionRowComponents((row) => row.addComponents(menu));

    const thresholdRecords = threshold.history;
    const labels = thresholdRecords.map((record) => moment(record.timestamp).format('DD MMM'));

    const ranksToShow = args.ranks?.length ? args.ranks.map(Number) : [1, 100, 500, 1000, 5000, 10000, 50000];
    const compareMode = ranksToShow.length <= 3;

    const datasets = ranksToShow.map((rank, i) => {
      return {
        label: `#${rank}`,
        data: thresholdRecords.map((entry) => {
          const t = entry.thresholds.find((th) => th.rank === rank);
          return t ? t.minTrophies : null;
        }),
        borderWidth: 2,
        borderColor: compareMode ? solidColors[i] : colors[i % colors.length],
        backgroundColor: compareMode ? solidColors[i] + '33' : colors[i % colors.length],
        fill: compareMode,
        tension: 0.2,
        ...(compareMode && {
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          pointBackgroundColor: solidColors[i],
          pointHoverBackgroundColor: solidColors[i]
        })
      };
    });

    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: compareMode
              ? `Legend League Trophy Thresholds (Rank ${ranksToShow.join(', ')})`
              : 'Legend League Trophy Thresholds by Rank'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          },
          legend: {
            display: !compareMode,
            position: 'top'
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    };

    const body = await fetch('https://quickchart.io/chart/create', {
      body: JSON.stringify({
        version: '4',
        backgroundColor: '#ffffff',
        width: 800,
        height: 450,
        devicePixelRatio: 2.0,
        format: 'png',
        chart: config
      }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then((res) => res.json());

    const url = (body as any).url as string;
    const webLink = url.replace('chart/render', 'chart-maker/view');

    const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
    container.addMediaGalleryComponents(media);

    container.addActionRowComponents((row) =>
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(webLink).setLabel('Open in Web'))
    );

    return interaction.editReply({ withComponents: true, components: [container, row] });
  }

  private async getLegendThreshold(isEod: boolean, ref?: string) {
    const res = await fetch('https://api.clashperk.com/v1/players/legend-ranking-thresholds', {
      method: 'GET',
      headers: {
        'X-API-KEY': `${process.env.INTERNAL_API_KEY}`
      }
    });
    if (!res.ok) throw new Error(res.statusText);

    const data = (await res.json()) as {
      live: LegendRankingThresholdsDto;
      eod: LegendRankingThresholdsDto | null;
      history: LegendRankingThresholdsDto[];
    };

    if (ref && moment(ref).isValid()) {
      const entry = data.history.findIndex((record) => moment(record.timestamp).startOf('day').isSame(moment(ref).startOf('day'), 'day'));
      if (!(entry >= 0)) return null;

      const [lastRecord, record] = [data.history[entry - 1], data.history[entry]];
      return { ...this.compare(record, lastRecord), history: data.history, isLive: false };
    }

    if (data.eod && isEod) {
      return { ...this.compare(data.eod, data.history.at(-2)), history: data.history, isLive: false };
    }
    if (data.eod && !isEod) {
      return { ...this.compare(data.live, data.eod), history: data.history, isLive: true };
    }

    return null;
  }

  private compare(target: LegendRankingThresholdsDto, reference?: LegendRankingThresholdsDto) {
    const thresholds = target.thresholds.map((threshold) => {
      const eod = reference?.thresholds.find((t) => t.rank === threshold.rank)?.minTrophies ?? threshold.minTrophies;
      return { ...threshold, diff: threshold.minTrophies - eod };
    });
    return { timestamp: target.timestamp, thresholds, hasDiff: !!reference };
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
