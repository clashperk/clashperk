import { Collections } from '@app/constants';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction
} from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';
import Google from '../../struct/google.js';
import { EMOJIS } from '../../util/emojis.js';

export default class ClanActivityCommand extends Command {
  public constructor() {
    super('activity', {
      category: 'activity',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'AttachFiles'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; days?: number; timezone?: string; limit?: number }
  ) {
    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, {
      args: args.clans
    });
    if (!clans) return;

    const result = await this.aggregate(
      clans.map((clan) => clan.tag),
      args.days || 1,
      args.limit || 10 // if the limit is not provided; let's pick up 10
    );

    if (!result.length)
      return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
    const timezone = await this.getTimezoneOffset(interaction, args.timezone);

    const days = args.days ?? 1;
    const isHourly = days <= 3;
    const itemCount = isHourly ? 24 : 1;
    const dataLabel = new Array(days * itemCount)
      .fill(0)
      .map((_, i) => {
        const decrement =
          new Date().getTime() - (isHourly ? 60 * 60 * 1000 : 60 * 60 * 1000 * 24) * i;
        const key = isHourly
          ? moment(decrement).minutes(0).seconds(0).milliseconds(0).toISOString()
          : moment(decrement).hours(0).minutes(0).seconds(0).milliseconds(0).toISOString();
        return {
          key,
          timestamp: new Date(new Date(key).getTime() + timezone.offset * 1000)
        };
      })
      .reverse();

    const clansMap = Object.fromEntries(clans.map((clan) => [clan.tag, clan.name]));
    const datasets = result
      .map((clan) => ({
        name: clansMap[clan.clanTag] || clan.clanTag,
        data: this.datasets(dataLabel, clan)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const unit = isHourly ? 'hour' : 'day';
    const hrStart = process.hrtime();
    const res = await fetch(`${process.env.IMAGE_GEN_API_BASE_URL!}/clans/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        labels: dataLabel.map((d) => d.timestamp),
        datasets,
        offset: timezone.offset * 1000,
        unit: isHourly ? 'hour' : 'day',
        title: `Active Members Per ${this.titleCase(unit)} (${timezone.name})`
      })
    });
    const arrayBuffer = await res.arrayBuffer();

    const rawFile = new AttachmentBuilder(Buffer.from(arrayBuffer), {
      name: 'chart.png'
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setEmoji(EMOJIS.REFRESH)
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(
            this.createId({
              cmd: this.id,
              clans: resolvedArgs,
              days: args.days,
              timezone: args.timezone,
              limit: args.limit
            })
          )
      )
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Open in Web')
          .setURL(`https://clashperk.com/web/charts/${res.headers.get('x-chart-id')}`)
      );

    const timeZoneCommand = this.client.commands.get('/timezone');
    await interaction.editReply({
      content:
        timezone.name === 'UTC' ? `Set your timezone with the ${timeZoneCommand} command.` : null,
      files: [rawFile],
      components: [row]
    });

    const diff = process.hrtime(hrStart);
    this.client.logger.info(
      `Rendered in ${(diff.at(0)! * 1000 + diff.at(1)! / 1000000).toFixed(2)}ms`,
      {
        label: 'CHART'
      }
    );
  }

  private async getTimezoneOffset(interaction: CommandInteraction<'cached'>, location?: string) {
    const zone = location ? moment.tz.zone(location) : null;
    if (zone) return { offset: zone.utcOffset(Date.now()) * 60 * -1, name: zone.name };

    const user = await this.client.db
      .collection(Collections.USERS)
      .findOne({ userId: interaction.user.id });
    if (!location) {
      if (!user?.timezone?.id) return { offset: 0, name: 'UTC' };
      return {
        offset: moment.tz.zone(user.timezone.id)!.utcOffset(Date.now()) * 60 * -1,
        name: user.timezone.name
      };
    }

    const raw = await Google.timezone(location);
    if (!raw) return { offset: 0, name: 'UTC' };

    const offset = Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset);
    if (!user?.timezone) {
      await this.client.db.collection(Collections.USERS).updateOne(
        { userId: interaction.user.id },
        {
          $set: {
            username: interaction.user.username,
            displayName: interaction.user.displayName,
            discriminator: interaction.user.discriminator,
            timezone: {
              id: raw.timezone.timeZoneId,
              offset: Number(offset),
              name: raw.timezone.timeZoneName,
              location: raw.location.formatted_address
            }
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }

    return {
      offset: moment.tz.zone(raw.timezone.timeZoneId)!.utcOffset(Date.now()) * 60 * -1,
      name: raw.timezone.timeZoneName
    };
  }

  private async aggregate(clanTags: string[], days: number, limit: number) {
    const isHourly = days <= 3;

    const rows = await this.client.clickhouse
      .query({
        query: `
          SELECT
            clanTag,
            timestamp,
            uniqMerge(active_members) AS count
          FROM ${isHourly ? 'hourly_activities_mv' : 'daily_activities_mv'}
          FINAL
          WHERE
            clanTag IN {clanTags: Array(String)} AND timestamp >= now() - INTERVAL ${days} DAY
          GROUP BY timestamp, clanTag
          ORDER BY timestamp;
        `,
        query_params: {
          clanTags
        }
      })
      .then((res) => res.json<{ timestamp: string; count: string; clanTag: string }>());

    const groups = Object.entries(
      rows.data.reduce<
        Record<string, { activities: { count: number; time: string }[]; total: number }>
      >((record, row) => {
        if (!record[row.clanTag]) record[row.clanTag] = { activities: [], total: 0 };
        record[row.clanTag].activities.push({ count: Number(row.count), time: row.timestamp });
        record[row.clanTag].total += Number(row.count);
        return record;
      }, {})
    );

    if (!groups.length) return [];
    groups.sort((a, b) => b[1].total - a[1].total);

    return groups.slice(0, limit).map(([clanTag, { activities }]) => ({
      clanTag,
      activities: activities.map((activity) => ({
        count: activity.count,
        time: moment(activity.time).toISOString()
      }))
    }));
  }

  private datasets(dataLabel: any[], data: any) {
    return dataLabel.map(({ key }) => {
      const id = data.activities.find((e: any) => e.time === key);
      return id?.count ?? 0;
    });
  }

  private titleCase(str: string) {
    return str
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b(\w)/g, (char) => char.toUpperCase());
  }

  private async leaveJoinGraph(interaction: CommandInteraction<'cached'>, clanTag: string) {
    await this.client.elastic.search({
      size: 0,
      from: 0,
      query: {
        match: {
          clan_tag: clanTag
        }
      },
      aggs: {
        dates: {
          date_histogram: {
            field: 'created_at',
            calendar_interval: '1d',
            min_doc_count: 0
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
  }
}
