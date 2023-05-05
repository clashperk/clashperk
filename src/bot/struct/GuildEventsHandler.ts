import { Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, PermissionFlagsBits, time } from 'discord.js';
import moment from 'moment';
import { Collections } from '../util/Constants.js';
import { i18n } from '../util/i18n.js';
import { Season } from '../util/index.js';
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

	private _events(guild: Guild) {
		const now = moment().toDate();

		const clanGamesStartTime = moment(Season.ID).startOf('month').add(21, 'days').add(8, 'hours').toDate();
		const clanGamesEndTime = moment(Season.ID)
			.startOf('month')
			.add(21 + 6, 'days')
			.add(8, 'hours')
			.toDate();

		const CWLStartTime =
			moment(now).date() >= 10 && moment(now).hour() >= 8
				? moment(now).startOf('month').add(1, 'month').add(8, 'hour').toDate()
				: moment(now).startOf('month').add(8, 'hours').toDate();
		const CWLSignupEndTime = moment(CWLStartTime).add(2, 'days').toDate();
		const CWLEndTime = moment(CWLStartTime).add(9, 'days').toDate();

		const seasonEndTime = moment(Season.endTimestamp).toDate();
		const { raidWeekEndTime, raidWeekStartTime } = this.getRaidWeek(now);

		const events = [
			{
				type: 'clan_games_start',
				name: i18n('common.labels.clan_games', { lng: guild.preferredLocale }),
				value: `${time(clanGamesStartTime, 'R')}\n${time(clanGamesStartTime, 'f')}`,
				timestamp: clanGamesStartTime.getTime(),
				visible: moment(now).isBefore(clanGamesStartTime) || moment(now).isAfter(clanGamesEndTime)
			},
			{
				type: 'clan_games_end',
				name: i18n('common.labels.clan_games_ending', { lng: guild.preferredLocale }),
				value: `${time(clanGamesEndTime, 'R')}\n${time(clanGamesEndTime, 'f')}`,
				timestamp: clanGamesEndTime.getTime(),
				visible: moment(now).isAfter(clanGamesStartTime) && moment(now).isBefore(clanGamesEndTime)
			},
			{
				type: 'cwl_start',
				name: i18n('common.labels.cwl', { lng: guild.preferredLocale }),
				value: `${time(CWLStartTime, 'R')}\n${time(CWLStartTime, 'f')}`,
				timestamp: CWLStartTime.getTime(),
				visible: moment(now).isBefore(CWLStartTime)
			},
			{
				type: 'cwl_end',
				name: i18n('common.labels.cwl_end', { lng: guild.preferredLocale }),
				value: `${time(CWLEndTime, 'R')}\n${time(CWLEndTime, 'f')}`,
				timestamp: CWLEndTime.getTime(),
				visible: moment(now).isAfter(CWLSignupEndTime)
			},
			{
				type: 'cwl_signup_end',
				name: i18n('common.labels.cwl_signup_ending', { lng: guild.preferredLocale }),
				value: `${time(CWLSignupEndTime, 'R')}\n${time(CWLSignupEndTime, 'f')}`,
				timestamp: CWLSignupEndTime.getTime(),
				visible: moment(now).isAfter(CWLStartTime) && moment(now).isBefore(CWLSignupEndTime)
			},
			{
				type: 'season_end',
				name: i18n('common.labels.league_reset', { lng: guild.preferredLocale }),
				value: `${time(seasonEndTime, 'R')}\n${time(seasonEndTime, 'f')}`,
				timestamp: seasonEndTime.getTime(),
				visible: true
			},
			{
				type: 'raid_week_start',
				name: i18n('common.labels.raid_weekend', { lng: guild.preferredLocale }),
				value: `${time(raidWeekStartTime, 'R')}\n${time(raidWeekStartTime, 'f')}`,
				timestamp: raidWeekStartTime.getTime(),
				visible: moment(now).isBefore(raidWeekStartTime) || moment(now).isAfter(raidWeekEndTime)
			},
			{
				type: 'raid_week_end',
				name: i18n('common.labels.raid_weekend_ending', { lng: guild.preferredLocale }),
				value: `${time(raidWeekEndTime, 'R')}\n${time(raidWeekEndTime, 'f')}`,
				timestamp: raidWeekEndTime.getTime(),
				visible: moment(now).isAfter(raidWeekStartTime) && moment(now).isBefore(raidWeekEndTime)
			}
		];

		events.sort((a, b) => a.timestamp - b.timestamp);
		return events.filter((event) => event.visible);
	}

	public async create(guild: Guild, guildEvent: GuildEventData) {
		if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageEvents)) return null;

		for (const event of this._events(guild)) {
			if (guildEvent.allowedEvents && !guildEvent.allowedEvents.includes(event.type)) continue;
			if (guildEvent.events[event.type] === event.timestamp) continue;

			await guild.scheduledEvents.create({
				name: event.name,
				entityType: GuildScheduledEventEntityType.External,
				privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
				scheduledStartTime: new Date(event.timestamp),
				scheduledEndTime: new Date(event.timestamp + 1000 * 60 * guildEvent.maxDuration),
				entityMetadata: { location: 'in game' },
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

		try {
			for await (const guildEvent of cursor) {
				const guild = this.client.guilds.cache.get(guildEvent.guildId);
				if (!guild) continue;
				await this.create(guild, guildEvent);
			}
		} finally {
			setTimeout(this.init.bind(this), 1000 * 60 * 30).unref();
		}
	}

	private getRaidWeek(now: Date) {
		const start = moment(now);
		const day = start.day();
		const hour = start.hours();

		if (day === 1) {
			if (hour < 7) {
				start.day(-7).weekday(5);
			} else {
				start.weekday(5);
			}
		}

		if (day === 0) {
			start.day(-1).weekday(5);
		}

		if (day > 1 && day < 5) {
			start.weekday(5);
		}

		if (day === 6) {
			start.weekday(5);
		}

		start.hour(7).minute(0).second(0).millisecond(0);
		const end = moment(start).add(3, 'days');

		return { raidWeekStartTime: start.toDate(), raidWeekEndTime: end.toDate() };
	}
}

export interface GuildEventData {
	guildId: string;
	enabled: boolean;
	events: Record<string, number>;
	maxDuration: number;
	allowedEvents?: string[];
	images?: Record<string, string>;
	createdAt: Date;
}
