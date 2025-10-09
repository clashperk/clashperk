import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown, time, User } from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
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
      tag?: string;
      user?: User;
      start_date?: string;
      end_date?: string;
    }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args?.tag ?? args.user?.id);
    if (!clan) return;

    if ((args.start_date && !moment(args.start_date, true).isValid()) || (args.end_date && !moment(args.end_date, true).isValid())) {
      return interaction.editReply('Invalid date format, allowed formats are `YYYY-MM-DD` or `YYYY-MM-DD HH:mm`');
    }

    const startTime = moment(args.start_date || Season.getSeason().startTime).toDate();
    const endTime = moment(args.end_date || new Date()).toDate();

    if (moment(endTime).diff(moment(startTime), 'months') > 6) {
      return interaction.editReply('The date range cannot exceed 6 months.');
    }

    if (moment(startTime).isAfter(endTime)) {
      return interaction.editReply('The start date cannot be after the end date.');
    }

    const rows = await this.client.clickhouse
      .query({
        format: 'JSON',
        query: `
          SELECT
            tag,
            SUM(if(action = 'DONATED', value, 0))  AS donated,
            SUM(if(action = 'RECEIVED', value, 0)) AS received
          FROM
            donation_records
          WHERE
            clanTag = {clanTag: String}
            AND tag IN {tags: Array(String)}
            AND createdAt >= {startDate: DateTime}
            AND createdAt <= {endDate: DateTime}
          GROUP BY
            tag
          ORDER BY
            donated DESC, received DESC
        `,
        query_params: {
          clanTag: clan.tag,
          tags: clan.memberList.map((member) => member.tag),
          startDate: Math.floor(startTime.getTime() / 1000),
          endDate: Math.floor(endTime.getTime() / 1000)
        }
      })
      .then((res) => res.json<AggregatedRaw>());

    const data = rows.data.map((row) => ({
      ...row,
      donated: Number(row.donated),
      received: Number(row.received)
    }));

    const playersMap = data.reduce<Record<string, AggregatedResult>>((record, item) => {
      record[item.tag] = item;
      return record;
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

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(this.createId({ cmd: this.id, tag: args.tag, start_date: args.start_date, end_date: args.end_date }))
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({ embeds: [embed], components: !args.end_date ? [row] : [] });
  }
}

interface AggregatedResult {
  tag: string;
  donated: number;
  received: number;
}

type AggregatedRaw = {
  [K in keyof AggregatedResult]: string;
};
