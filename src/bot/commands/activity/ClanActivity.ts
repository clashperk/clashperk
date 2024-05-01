import { AttachmentBuilder, CommandInteraction } from 'discord.js';
import moment from 'moment';
import fetch from 'node-fetch';
import { Command } from '../../lib/index.js';
import Google from '../../struct/Google.js';
import { UserInfoModel } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';

export default class ClanActivityCommand extends Command {
  public constructor() {
    super('activity', {
      category: 'activity',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'AttachFiles'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; days?: number; timezone?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const result = await this.aggregate(
      clans.map((clan) => clan.tag),
      args.days ?? 1
    );

    if (!result.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
    const timezone = await this.getTimezoneOffset(interaction, args.timezone);

    const days = args.days ?? 1;
    const isHourly = days <= 3;
    const itemCount = isHourly ? 24 : 1;
    const dataLabel = new Array(days * itemCount)
      .fill(0)
      .map((_, i) => {
        const decrement = new Date().getTime() - (isHourly ? 60 * 60 * 1000 : 60 * 60 * 1000 * 24) * i;
        const key = isHourly
          ? moment(decrement).minutes(0).seconds(0).milliseconds(0).toISOString()
          : moment(decrement).hours(0).minutes(0).seconds(0).milliseconds(0).toISOString();
        return {
          key,
          timestamp: new Date(new Date(key).getTime() + timezone.offset * 1000)
        };
      })
      .reverse();

    const datasets = result.map((clan) => ({
      name: clan.name,
      data: this.datasets(dataLabel, clan)
    }));

    const unit = isHourly ? 'hour' : 'day';
    const hrStart = process.hrtime();
    const arrayBuffer = await fetch(`${process.env.ASSET_API_BACKEND!}/clans/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        labels: dataLabel.map((d) => d.timestamp),
        datasets,
        unit: isHourly ? 'hour' : 'day',
        title: `Active Members Per ${this.titleCase(unit)} (${timezone.name})`
      })
    }).then((res) => res.arrayBuffer());

    const rawFile = new AttachmentBuilder(Buffer.from(arrayBuffer), {
      name: 'chart.png'
    });

    const timeZoneCommand = this.client.commands.get('/timezone');
    await interaction.editReply({
      content: timezone.name === 'UTC' ? `Set your timezone with the ${timeZoneCommand} command.` : null,
      files: [rawFile]
    });

    const diff = process.hrtime(hrStart);
    this.client.logger.debug(`Rendered in ${(diff.at(0)! * 1000 + diff.at(1)! / 1000000).toFixed(2)}ms`, { label: 'CHART' });
  }

  private async getTimezoneOffset(interaction: CommandInteraction<'cached'>, location?: string) {
    const zone = location ? moment.tz.zone(location) : null;
    if (zone) return { offset: zone.utcOffset(Date.now()) * 60 * -1, name: zone.name };

    const user = await this.client.db.collection<UserInfoModel>(Collections.USERS).findOne({ userId: interaction.user.id });
    if (!location) {
      if (!user?.timezone?.id) return { offset: 0, name: 'UTC' };
      return { offset: moment.tz.zone(user.timezone.id)!.utcOffset(Date.now()) * 60 * -1, name: user.timezone.name };
    }

    const raw = await Google.timezone(location);
    if (!raw) return { offset: 0, name: 'UTC' };

    const offset = Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset);
    if (!user?.timezone) {
      await this.client.db.collection<UserInfoModel>(Collections.USERS).updateOne(
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

    return { offset: moment.tz.zone(raw.timezone.timeZoneId)!.utcOffset(Date.now()) * 60 * -1, name: raw.timezone.timeZoneName };
  }

  private aggregate(clanTags: string[], days: number) {
    const isHourly = days <= 3;
    return this.client.db
      .collection(Collections.LAST_SEEN)
      .aggregate([
        {
          $match: {
            'clan.tag': { $in: clanTags }
          }
        },
        {
          $match: {
            entries: {
              $exists: true
            }
          }
        },
        {
          $project: {
            tag: '$tag',
            clan: '$clan',
            entries: {
              $filter: {
                input: '$entries',
                as: 'en',
                cond: {
                  $gte: ['$$en.entry', new Date(Date.now() - days * 24 * 60 * 60 * 1000)]
                }
              }
            }
          }
        },
        {
          $unwind: {
            path: '$entries'
          }
        },
        {
          $set: {
            tag: '$tag',
            name: '$name',
            clan: '$clan',
            time: '$entries.entry'
          }
        },
        {
          $set: {
            hour: {
              $dateTrunc: {
                date: '$time',
                unit: isHourly ? 'hour' : 'day'
              }
            }
          }
        },
        {
          $sort: {
            time: -1
          }
        },
        {
          $group: {
            _id: {
              hour: '$hour',
              clan: '$clan.tag'
            },
            clan: {
              $last: '$clan'
            },
            tag: {
              $last: '$tag'
            },
            name: {
              $last: '$name'
            },
            hour: {
              $last: '$hour'
            },
            counterSet: {
              $addToSet: '$tag'
            }
          }
        },
        {
          $set: {
            count: {
              $min: [50, { $size: '$counterSet' }]
            }
          }
        },
        {
          $sort: {
            hour: -1
          }
        },
        {
          $group: {
            _id: '$_id.clan',
            entries: {
              $push: {
                time: '$hour',
                count: '$count'
              }
            },
            name: {
              $first: '$clan.name'
            }
          }
        },
        {
          $sort: {
            name: 1
          }
        },
        {
          $limit: 10
        }
      ])
      .toArray();
  }

  private datasets(dataLabel: any[], data: any) {
    return dataLabel.map(({ key }) => {
      const id = data.entries.find((e: any) => e.time.toISOString() === key);
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
