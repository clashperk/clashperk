import { Collections, FeatureFlags } from '@app/constants';
import { addBreadcrumb, captureException } from '@sentry/node';
import {
  Guild,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  PermissionFlagsBits,
  time
} from 'discord.js';
import moment from 'moment';
import { EMOJIS } from '../util/emojis.js';
import { i18n } from '../util/i18n.js';
import { Util } from '../util/toolkit.js';
import { Client } from './client.js';

export const imageMaps: Record<string, string> = {
  clan_games_start: 'clan_games_image_url',
  clan_games_end: 'clan_games_image_url',
  cwl_start: 'cwl_image_url',
  cwl_end: 'cwl_image_url',
  cwl_signup_end: 'cwl_image_url',
  season_end: 'season_reset_image_url',
  raid_week_start: 'raid_week_image_url',
  raid_week_end: 'raid_week_image_url'
};

export const locationsMap: Record<string, string> = {
  clan_games_start: 'clan_games_location',
  clan_games_end: 'clan_games_location',
  cwl_start: 'cwl_location',
  cwl_end: 'cwl_location',
  cwl_signup_end: 'cwl_location',
  season_end: 'season_reset_location',
  raid_week_start: 'raid_week_location',
  raid_week_end: 'raid_week_location'
};

export const eventsMap: Record<string, string> = {
  clan_games_start: 'Clan Games',
  clan_games_end: 'Clan Games (Ending)',
  cwl_start: 'CWL',
  cwl_end: 'CWL (Ending)',
  cwl_signup_end: 'CWL Signup (Ending)',
  season_end: 'Season Reset',
  raid_week_start: 'Raid Weekend',
  raid_week_end: 'Raid Weekend (Ending)'
};

const maxGraceTime = 30 * 60 * 1000;

export class GuildEventsHandler {
  public constructor(private readonly client: Client) {}

  public get eventTypes() {
    return [
      'clan_games_start',
      'clan_games_end',
      'cwl_start',
      'cwl_end',
      'cwl_signup_end',
      'season_end',
      'raid_week_start',
      'raid_week_end'
    ];
  }

  public get collection() {
    return this.client.db.collection<GuildEventData>(Collections.GUILD_EVENTS);
  }

  public getEvents(
    lng: string,
    { filtered, useGraceTime }: { filtered: boolean; useGraceTime: boolean }
  ) {
    const now = moment().toDate();
    const graceTime = useGraceTime ? maxGraceTime : 0;

    const clanGamesStartTime =
      moment(now).date() > 28 || (moment(now).date() >= 28 && moment(now).hour() >= 8)
        ? moment(now).startOf('month').add(1, 'month').add(21, 'days').add(8, 'hours').toDate()
        : moment(now).startOf('month').add(21, 'days').add(8, 'hours').toDate();
    const clanGamesEndTime = moment(clanGamesStartTime)
      .add(6, 'days')
      .subtract(graceTime, 'milliseconds')
      .toDate();

    const cwlStartTime =
      moment(now).date() > 10 || (moment(now).date() >= 10 && moment(now).hour() >= 8)
        ? moment(now).startOf('month').add(1, 'month').add(8, 'hour').toDate()
        : moment(now).startOf('month').add(8, 'hours').toDate();
    const cwlSignupEndTime = moment(cwlStartTime)
      .add(2, 'days')
      .subtract(graceTime, 'milliseconds')
      .toDate();
    const cwlEndTime = moment(cwlStartTime)
      .add(9, 'days')
      .subtract(graceTime, 'milliseconds')
      .toDate();

    const seasonEndTime = moment(Util.getSeason().endTime)
      .subtract(graceTime, 'milliseconds')
      .toDate();

    const { raidWeekEndTime: _raidWeekEndTime, raidWeekStartTime } = Util.geRaidWeekend(now);
    const raidWeekEndTime = moment(_raidWeekEndTime).subtract(graceTime, 'milliseconds').toDate();

    const getCorrectedEndTime = (timestamp: Date) => {
      timestamp = moment(timestamp).add(graceTime, 'milliseconds').toDate();
      return timestamp;
    };

    const getFormattedValue = (timestamp: Date) => {
      timestamp = getCorrectedEndTime(timestamp);
      return `${time(timestamp, 'R')}\n${time(timestamp, 'f')}`;
    };

    const events = [
      {
        type: 'clan_games_start',
        name: i18n('common.choices.clan_games', { lng }),
        formattedName: `${EMOJIS.CLAN_GAMES} ${i18n('common.choices.clan_games', { lng })}`,
        value: `${time(clanGamesStartTime, 'R')}\n${time(clanGamesStartTime, 'f')}`,
        timestamp: clanGamesStartTime.getTime(),
        visible:
          moment(now).isBefore(clanGamesStartTime) ||
          moment(now).isAfter(getCorrectedEndTime(clanGamesEndTime))
      },
      {
        type: 'clan_games_end',
        name: i18n('common.choices.clan_games_ending', { lng }),
        formattedName: `${EMOJIS.CLAN_GAMES} ${i18n('common.choices.clan_games_ending', { lng })}`,
        value: getFormattedValue(clanGamesEndTime),
        timestamp: clanGamesEndTime.getTime(),
        visible: moment(now).isAfter(clanGamesStartTime) && moment(now).isBefore(clanGamesEndTime)
      },
      {
        type: 'cwl_start',
        name: i18n('common.choices.cwl', { lng }),
        formattedName: `${EMOJIS.CWL} ${i18n('common.choices.cwl', { lng })}`,
        value: `${time(cwlStartTime, 'R')}\n${time(cwlStartTime, 'f')}`,
        timestamp: cwlStartTime.getTime(),
        visible: moment(now).isBefore(cwlStartTime)
      },
      {
        type: 'cwl_end',
        name: i18n('common.choices.cwl_end', { lng }),
        formattedName: `${EMOJIS.CWL} ${i18n('common.choices.cwl_end', { lng })}`,
        value: getFormattedValue(cwlEndTime),
        timestamp: cwlEndTime.getTime(),
        visible: moment(now).isAfter(cwlSignupEndTime)
      },
      {
        type: 'cwl_signup_end',
        name: i18n('common.choices.cwl_signup_ending', { lng }),
        formattedName: `${EMOJIS.CWL} ${i18n('common.choices.cwl_signup_ending', { lng })}`,
        value: getFormattedValue(cwlSignupEndTime),
        timestamp: cwlSignupEndTime.getTime(),
        visible: moment(now).isAfter(cwlStartTime) && moment(now).isBefore(cwlSignupEndTime)
      },
      {
        type: 'season_end',
        name: i18n('common.choices.league_reset', { lng }),
        formattedName: `${EMOJIS.TROPHY} ${i18n('common.choices.league_reset', { lng })} (${moment(seasonEndTime).format('MMM YYYY')})`,
        value: getFormattedValue(seasonEndTime),
        timestamp: seasonEndTime.getTime(),
        visible: true
      },
      {
        type: 'raid_week_start',
        name: i18n('common.choices.raid_weekend', { lng }),
        formattedName: `${EMOJIS.CAPITAL_RAID} ${i18n('common.choices.raid_weekend', { lng })}`,
        value: `${time(raidWeekStartTime, 'R')}\n${time(raidWeekStartTime, 'f')}`,
        timestamp: raidWeekStartTime.getTime(),
        visible:
          moment(now).isBefore(raidWeekStartTime) ||
          moment(now).isAfter(getCorrectedEndTime(raidWeekEndTime))
      },
      {
        type: 'raid_week_end',
        name: i18n('common.choices.raid_weekend_ending', { lng }),
        formattedName: `${EMOJIS.CAPITAL_RAID} ${i18n('common.choices.raid_weekend_ending', { lng })}`,
        value: getFormattedValue(raidWeekEndTime),
        timestamp: raidWeekEndTime.getTime(),
        visible: moment(now).isAfter(raidWeekStartTime) && moment(now).isBefore(raidWeekEndTime)
      }
    ];

    events.sort((a, b) => a.timestamp - b.timestamp);
    if (filtered) return events.filter((event) => event.visible);
    return events;
  }

  private getMaxDuration(lng: string, event: EventRecord, guildEvent: GuildEventData) {
    if (guildEvent.durationOverrides?.includes(event.type)) {
      const record = this.getEvents(lng, { filtered: false, useGraceTime: false }).find(
        (ev) => ev.type === event.type.replace(/_start/g, '_end')
      );
      if (record && record.timestamp > Date.now()) return record.timestamp;
    }
    return event.timestamp + maxGraceTime;
  }

  public async create(guild: Guild, guildEvent: GuildEventData) {
    if (
      !guild.members.me?.permissions.has([
        PermissionFlagsBits.ManageEvents,
        PermissionFlagsBits.CreateEvents
      ])
    )
      return null;

    for (const event of this.getEvents(guild.preferredLocale, {
      filtered: true,
      useGraceTime: true
    })) {
      if (guildEvent.allowedEvents && !guildEvent.allowedEvents.includes(event.type)) continue;

      if (event.timestamp === guildEvent.events[event.type]) continue;
      if (event.timestamp + maxGraceTime === guildEvent.events[event.type]) continue;

      const endTime = this.getMaxDuration(guild.preferredLocale, event, guildEvent);
      await guild.scheduledEvents.create({
        name: event.name,
        entityType: GuildScheduledEventEntityType.External,
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        scheduledStartTime: new Date(event.timestamp),
        scheduledEndTime: new Date(endTime),
        entityMetadata: { location: guildEvent.locations?.[locationsMap[event.type]] ?? 'in game' },
        description: event.value,
        image: !guildEvent.tooLargeImage ? guildEvent.images?.[imageMaps[event.type]] : null
      });

      await this.collection.updateOne(
        { guildId: guild.id },
        {
          $set: {
            [`events.${event.type}`]: event.timestamp
          }
        }
      );
    }
  }

  public async init() {
    const cursor = this.collection.find({
      guildId: { $in: this.client.guilds.cache.map((guild) => guild.id) },
      enabled: true
    });

    const isEnabled = this.client.isFeatureEnabled(FeatureFlags.GUILD_EVENT_SCHEDULER, 'global');

    try {
      for await (const guildEvent of cursor) {
        const guild = this.client.guilds.cache.get(guildEvent.guildId);
        if (!guild || !isEnabled) continue;

        if (this.client.settings.hasCustomBot(guild) && !this.client.isCustom()) continue;

        try {
          await this.create(guild, guildEvent);
        } catch (error) {
          if (error.message.includes('BINARY_TYPE_MAX_SIZE')) {
            await this.collection.updateOne(
              { guildId: guild.id },
              {
                $set: {
                  tooLargeImage: true
                }
              }
            );
          }

          addBreadcrumb({
            message: 'guild_event_scheduler_errored',
            category: 'guild_event_scheduler',
            level: 'error',
            data: {
              guildId: guild.id,
              name: guild.name,
              error: error.message
            }
          });
          captureException(error);
          this.client.logger.error(error.message, { label: 'GuildEventsHandler' });
        }
      }
    } finally {
      setTimeout(this.init.bind(this), 1000 * 60 * 30).unref();
    }
  }
}

export interface GuildEventData {
  guildId: string;
  enabled: boolean;
  events: Record<string, number>;
  allowedEvents?: string[];
  images?: Record<string, string>;
  tooLargeImage?: boolean;
  locations?: Record<string, string | null>;
  createdAt: Date;
  durationOverrides?: string[];
}

export interface EventRecord {
  type: string;
  name: string;
  value: string;
  timestamp: number;
  visible: boolean;
}
