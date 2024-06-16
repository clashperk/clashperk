import { Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, PermissionFlagsBits, time } from 'discord.js';
import moment from 'moment';
import { Collections, FeatureFlags } from '../util/Constants.js';
import { EMOJIS } from '../util/Emojis.js';
import { i18n } from '../util/i18n.js';
import { Season, Util } from '../util/index.js';
import Client from './Client.js';

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

  public getEvents(lng: string, filtered = true) {
    const now = moment().toDate();

    const clanGamesStartTime =
      moment(now).date() > 28 || (moment(now).date() >= 28 && moment(now).hour() >= 8)
        ? moment(now).startOf('month').add(1, 'month').add(21, 'days').add(8, 'hours').toDate()
        : moment(now).startOf('month').add(21, 'days').add(8, 'hours').toDate();
    const clanGamesEndTime = moment(clanGamesStartTime).add(6, 'days').toDate();

    const CWLStartTime =
      moment(now).date() > 10 || (moment(now).date() >= 10 && moment(now).hour() >= 8)
        ? moment(now).startOf('month').add(1, 'month').add(8, 'hour').toDate()
        : moment(now).startOf('month').add(8, 'hours').toDate();
    const CWLSignupEndTime = moment(CWLStartTime).add(2, 'days').toDate();
    const CWLEndTime = moment(CWLStartTime).add(9, 'days').toDate();

    const seasonEndTime = moment(Season.endTimestamp).toDate();
    const { raidWeekEndTime, raidWeekStartTime } = Util.geRaidWeekend(now);

    const events = [
      {
        type: 'clan_games_start',
        name: i18n('common.labels.clan_games', { lng }),
        formattedName: `${EMOJIS.CLAN_GAMES} ${i18n('common.labels.clan_games', { lng })}`,
        value: `${time(clanGamesStartTime, 'R')}\n${time(clanGamesStartTime, 'f')}`,
        timestamp: clanGamesStartTime.getTime(),
        visible: moment(now).isBefore(clanGamesStartTime) || moment(now).isAfter(clanGamesEndTime)
      },
      {
        type: 'clan_games_end',
        name: i18n('common.labels.clan_games_ending', { lng }),
        formattedName: `${EMOJIS.CLAN_GAMES} ${i18n('common.labels.clan_games_ending', { lng })}`,
        value: `${time(clanGamesEndTime, 'R')}\n${time(clanGamesEndTime, 'f')}`,
        timestamp: clanGamesEndTime.getTime(),
        visible: moment(now).isAfter(clanGamesStartTime) && moment(now).isBefore(clanGamesEndTime)
      },
      {
        type: 'cwl_start',
        name: i18n('common.labels.cwl', { lng }),
        formattedName: `${EMOJIS.CWL} ${i18n('common.labels.cwl', { lng })}`,
        value: `${time(CWLStartTime, 'R')}\n${time(CWLStartTime, 'f')}`,
        timestamp: CWLStartTime.getTime(),
        visible: moment(now).isBefore(CWLStartTime)
      },
      {
        type: 'cwl_end',
        name: i18n('common.labels.cwl_end', { lng }),
        formattedName: `${EMOJIS.CWL} ${i18n('common.labels.cwl_end', { lng })}`,
        value: `${time(CWLEndTime, 'R')}\n${time(CWLEndTime, 'f')}`,
        timestamp: CWLEndTime.getTime(),
        visible: moment(now).isAfter(CWLSignupEndTime)
      },
      {
        type: 'cwl_signup_end',
        name: i18n('common.labels.cwl_signup_ending', { lng }),
        formattedName: `${EMOJIS.CWL} ${i18n('common.labels.cwl_signup_ending', { lng })}`,
        value: `${time(CWLSignupEndTime, 'R')}\n${time(CWLSignupEndTime, 'f')}`,
        timestamp: CWLSignupEndTime.getTime(),
        visible: moment(now).isAfter(CWLStartTime) && moment(now).isBefore(CWLSignupEndTime)
      },
      {
        type: 'season_end',
        name: i18n('common.labels.league_reset', { lng }),
        formattedName: `${EMOJIS.TROPHY} ${i18n('common.labels.league_reset', { lng })} (${moment(seasonEndTime).format('MMM YYYY')})`,
        value: `${time(seasonEndTime, 'R')}\n${time(seasonEndTime, 'f')}`,
        timestamp: seasonEndTime.getTime(),
        visible: true
      },
      {
        type: 'raid_week_start',
        name: i18n('common.labels.raid_weekend', { lng }),
        formattedName: `${EMOJIS.CAPITAL_RAID} ${i18n('common.labels.raid_weekend', { lng })}`,
        value: `${time(raidWeekStartTime, 'R')}\n${time(raidWeekStartTime, 'f')}`,
        timestamp: raidWeekStartTime.getTime(),
        visible: moment(now).isBefore(raidWeekStartTime) || moment(now).isAfter(raidWeekEndTime)
      },
      {
        type: 'raid_week_end',
        name: i18n('common.labels.raid_weekend_ending', { lng }),
        formattedName: `${EMOJIS.CAPITAL_RAID} ${i18n('common.labels.raid_weekend_ending', { lng })}`,
        value: `${time(raidWeekEndTime, 'R')}\n${time(raidWeekEndTime, 'f')}`,
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
      const record = this.getEvents(lng, false).find((ev) => ev.type === event.type.replace(/_start/g, '_end'));
      if (record && record.timestamp > Date.now()) return record.timestamp;
    }
    return event.timestamp + guildEvent.maxDuration * 60 * 1000;
  }

  public async create(guild: Guild, guildEvent: GuildEventData) {
    if (!guild.members.me?.permissions.has([PermissionFlagsBits.ManageEvents, 1n << 44n])) return null;

    for (const event of this.getEvents(guild.preferredLocale)) {
      if (guildEvent.allowedEvents && !guildEvent.allowedEvents.includes(event.type)) continue;
      if (guildEvent.events[event.type] === event.timestamp) continue;

      const endTime = this.getMaxDuration(guild.preferredLocale, event, guildEvent);
      await guild.scheduledEvents.create({
        name: event.name,
        entityType: GuildScheduledEventEntityType.External,
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        scheduledStartTime: new Date(event.timestamp),
        scheduledEndTime: new Date(endTime),
        entityMetadata: { location: guildEvent.locations?.[locationsMap[event.type]] ?? 'in game' },
        description: event.value,
        image: guildEvent.images?.[imageMaps[event.type]]
      });

      await this.client.db.collection(Collections.GUILD_EVENTS).updateOne(
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
    const cursor = this.client.db.collection<GuildEventData>(Collections.GUILD_EVENTS).find({
      guildId: { $in: this.client.guilds.cache.map((guild) => guild.id) },
      enabled: true
    });

    const isEnabled = await this.client.isFeatureEnabled(FeatureFlags.GUILD_EVENT_SCHEDULER, 'global');

    try {
      for await (const guildEvent of cursor) {
        const guild = this.client.guilds.cache.get(guildEvent.guildId);
        if (!guild || !isEnabled) continue;

        if (this.client.settings.hasCustomBot(guild) && !this.client.isCustom()) continue;

        await this.create(guild, guildEvent);
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
  maxDuration: number;
  allowedEvents?: string[];
  images?: Record<string, string>;
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
