import { Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, PermissionFlagsBits, time } from 'discord.js';
import moment from 'moment';
import { Collections } from '../util/Constants.js';
import { Season } from '../util/index.js';
import { i18n } from '../util/i18n.js';
import Client from './Client.js';

export class GuildEventsHandler {
	public constructor(private readonly client: Client) {}

	private _events(guild: Guild) {
		const now = moment().toDate();

		const clanGamesStartTime = moment(Season.ID).startOf('month').add(21, 'days').add(8, 'hours').toDate();
		const clanGamesEndTime = moment(Season.ID)
			.startOf('month')
			.add(21 + 6, 'days')
			.add(8, 'hours')
			.toDate();

		const CWLStartTime =
			moment(now).date() >= 9
				? moment(now).startOf('month').add(1, 'month').add(8, 'hour').toDate()
				: moment(now).startOf('month').add(8, 'hours').toDate();
		const CWLSignupEndTime = moment(CWLStartTime).add(1, 'days').toDate();

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
			if (guildEvent.events[event.type] === event.timestamp) continue;

			await guild.scheduledEvents.create({
				name: event.name,
				entityType: GuildScheduledEventEntityType.External,
				privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
				scheduledStartTime: new Date(event.timestamp),
				scheduledEndTime: new Date(event.timestamp + 1000 * 60 * guildEvent.maxDuration),
				entityMetadata: { location: 'in game' },
				description: event.value
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
			guildId: { $in: this.client.guilds.cache.map((guild) => guild.id) }
		});

		try {
			for await (const guildEvent of cursor) {
				const guild = this.client.guilds.cache.get(guildEvent.guildId);
				if (!guild) continue;
				await this.create(guild, guildEvent);
			}
		} finally {
			setTimeout(this.init.bind(this), 1000 * 60 * 30).unref();
			// setTimeout(this.init.bind(this), 1000 * 10).unref();
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
	events: Record<string, number>;
	maxDuration: number;
	createdAt: Date;
}
