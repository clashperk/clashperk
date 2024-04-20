import { RaidRemindersEntity, RaidSchedulersEntity } from '@app/entities';
import { APICapitalRaidSeason } from 'clashofclans.js';
import {
	APIMessage,
	ForumChannel,
	MediaChannel,
	MessageMentionOptions,
	NewsChannel,
	TextChannel,
	WebhookClient,
	escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { Collection, ObjectId, WithId } from 'mongodb';
import { unique } from 'radash';
import { Collections, MAX_TOWN_HALL_LEVEL, Settings } from '../util/Constants.js';
import { Util } from '../util/index.js';
import { Client } from './Client.js';

export const ReminderDeleteReasons = {
	REMINDER_NOT_FOUND: 'reminder_not_found',
	REMINDER_DISABLED: 'reminder_disabled',
	CHANNEL_NOT_FOUND: 'channel_not_found',
	TOO_LATE: 'too_late',
	CHANNEL_MISSING_PERMISSIONS: 'channel_missing_permissions',
	REMINDER_SENT_SUCCESSFULLY: 'reminder_sent_successfully',
	NO_RECIPIENT: 'no_recipient',
	GUILD_NOT_FOUND: 'guild_not_found',
	INVALID_WAR_TYPE: 'invalid_war_type',
	NOT_IN_WAR: 'not_in_war',
	WAR_ENDED: 'war_ended'
} as const;

export default class CapitalRaidScheduler {
	protected schedulers!: Collection<RaidSchedulersEntity>;
	protected reminders!: Collection<RaidRemindersEntity>;
	private readonly refreshRate: number;
	private readonly queued = new Map<string, NodeJS.Timeout>();

	public constructor(private readonly client: Client) {
		this.refreshRate = 5 * 60 * 1000;
		this.schedulers = this.client.db.collection(Collections.RAID_SCHEDULERS);
		this.reminders = this.client.db.collection(Collections.RAID_REMINDERS);
	}

	public static raidWeek() {
		const today = new Date();
		const weekDay = today.getUTCDay();
		const hours = today.getUTCHours();
		const isRaidWeek = (weekDay === 5 && hours >= 7) || [0, 6].includes(weekDay) || (weekDay === 1 && hours < 7);
		today.setUTCDate(today.getUTCDate() - today.getUTCDay());
		if (weekDay < 5 || (weekDay <= 5 && hours < 7)) today.setDate(today.getUTCDate() - 7);
		today.setUTCDate(today.getUTCDate() + 5);
		today.setUTCMinutes(0, 0, 0);
		return { weekDate: today, weekId: today.toISOString().slice(0, 10), isRaidWeek };
	}

	public async init() {
		const watchStream = this.schedulers.watch(
			[
				{
					$match: { operationType: { $in: ['insert', 'update', 'delete'] } }
				}
			],
			{ fullDocument: 'updateLookup' }
		);

		watchStream.on('change', (change) => {
			if (change.operationType === 'insert') {
				const schedule = change.fullDocument;
				if (schedule.timestamp.getTime() < Date.now() + this.refreshRate) {
					this.queue(schedule);
				}
			}

			if (change.operationType === 'delete') {
				const id: string = change.documentKey._id.toHexString();
				if (this.queued.has(id)) this.clear(id);
			}

			if (change.operationType === 'update') {
				const id: string = change.documentKey._id.toHexString();
				if (this.queued.has(id)) this.clear(id);
				const schedule = change.fullDocument;
				if (schedule && !schedule.triggered && schedule.timestamp.getTime() < Date.now() + this.refreshRate) {
					this.queue(schedule);
				}
			}
		});

		await this._refresh();
		setInterval(this._refresh.bind(this), this.refreshRate).unref();
	}

	public async getLastRaidSeason(tag: string) {
		const { body: data, res } = await this.client.http.getRaidSeasons(tag, 1);
		if (!res.ok || !data.items.length) return null;
		if (!data.items[0].members) return null;
		return data.items[0] as Required<APICapitalRaidSeason>;
	}

	public toDate(date: string) {
		return moment(date).toDate();
	}

	public async create(reminder: RaidRemindersEntity) {
		for (const tag of reminder.clans) {
			const data = await this.getLastRaidSeason(tag);
			if (!data) continue;

			const { body: clan, res } = await this.client.http.getClan(tag);
			if (!res.ok) continue;

			const rand = Math.random();
			const endTime = moment(data.endTime).toDate();

			const ms = endTime.getTime() - reminder.duration;
			if (Date.now() > new Date(ms).getTime()) continue;

			await this.schedulers.insertOne({
				_id: new ObjectId(),
				guild: reminder.guild,
				tag: clan.tag,
				name: clan.name,
				duration: reminder.duration,
				reminderId: reminder._id,
				source: `bot_${this.client.shard?.ids[0] ?? 0}_${rand}`,
				triggered: false,
				timestamp: new Date(ms),
				createdAt: new Date()
			});
		}
	}

	private queue(schedule: RaidSchedulersEntity) {
		if (this.client.settings.hasCustomBot(schedule.guild) && !this.client.isCustom()) return;
		if (!this.client.guilds.cache.has(schedule.guild)) return;

		this.queued.set(
			schedule._id.toHexString(),
			setTimeout(() => {
				this.trigger(schedule);
			}, schedule.timestamp.getTime() - Date.now())
		);
	}

	private async delete(schedule: RaidSchedulersEntity, reason: string) {
		if (!this.client.guilds.cache.has(schedule.guild)) return;

		this.clear(schedule._id.toHexString());
		return this.schedulers.updateOne({ _id: schedule._id }, { $set: { triggered: true, reason } });
	}

	private clear(id: string) {
		const timeoutId = this.queued.get(id);
		if (timeoutId) clearTimeout(timeoutId);
		return this.queued.delete(id);
	}

	private wasInMaintenance(schedule: RaidSchedulersEntity, data: APICapitalRaidSeason) {
		const timestamp = moment(data.endTime).toDate().getTime() - schedule.duration;
		return timestamp > schedule.timestamp.getTime();
	}

	public async unwantedMembers(clanMembers: { tag: string }[], weekId: string, clanTag: string) {
		const multi = this.client.redis.connection.multi();
		clanMembers.map((member) => multi.json.get(`RAID_MEMBER:${member.tag}`));
		const res = (await multi.exec()).filter((_) => _) as unknown as { tag: string; weekId: string; clan: { tag: string } }[];
		const members = res.filter((m) => m.weekId === weekId && m.clan.tag !== clanTag);
		return members.map((m) => m.tag);
	}

	private getWeekId(weekId: string) {
		return moment(weekId).toDate().toISOString().slice(0, 10);
	}

	public async getReminderText(
		reminder: Pick<RaidRemindersEntity, 'roles' | 'remaining' | 'guild' | 'message' | 'allMembers' | 'linkedOnly' | 'minThreshold'>,
		schedule: Pick<RaidSchedulersEntity, 'tag'>,
		data: Required<APICapitalRaidSeason>
	): Promise<[string | null, string[]]> {
		const { body: clan, res } = await this.client.http.getClan(schedule.tag);
		if (res.status === 503) throw new Error('MaintenanceBreak');
		if (!res.ok) return [null, []];
		const unwantedMembers = reminder.allMembers
			? await this.unwantedMembers(clan.memberList, this.getWeekId(data.startTime), schedule.tag)
			: [];

		const currentMemberTags = clan.memberList.map((m) => m.tag);
		const missingMembers = data.members.filter((m) => !currentMemberTags.includes(m.tag));
		const players = await this.client.http._getPlayers(clan.memberList);
		const clanMembers = players
			.map((player) => {
				const clanMember = clan.memberList.find((mem) => mem.tag === player.tag)!;
				const raidMember = data.members.find((mem) => mem.tag === player.tag);
				if (raidMember)
					return {
						...raidMember,
						role: player.role ?? clanMember.role,
						isParticipating: true,
						townHallLevel: player.townHallLevel
					};
				return {
					tag: player.tag,
					name: player.name,
					role: player.role ?? clanMember.role,
					attacks: 0,
					attackLimit: 5,
					bonusAttackLimit: 0,
					capitalResourcesLooted: 0,
					isParticipating: false,
					townHallLevel: player.townHallLevel
				};
			})
			.concat(missingMembers.map((mem) => ({ ...mem, role: 'member', isParticipating: true, townHallLevel: MAX_TOWN_HALL_LEVEL })))
			.filter((player) => player.townHallLevel > 5)
			.filter((m) => !unwantedMembers.includes(m.tag))
			.filter((m) => (reminder.allMembers ? m.attacks >= 0 : m.attacks >= 1))
			.filter((m) => (data.members.length >= 50 ? m.isParticipating : true));

		const members = clanMembers
			.filter((mem) => {
				if (reminder.minThreshold) {
					return mem.attacks < reminder.minThreshold;
				}
				// This logic will be removed later
				return reminder.remaining.includes(mem.attackLimit + mem.bonusAttackLimit - mem.attacks);
			})
			.filter((mem) => {
				if (reminder.roles.length === 4) return true;
				return reminder.roles.includes(mem.role);
			});
		if (!members.length) return [null, []];

		const links = await this.client.resolver.getLinkedUsers(members);

		const mentions: UserMention[] = [];

		for (const member of members) {
			const link = links.find((link) => link.tag === member.tag);
			if (!link && reminder.linkedOnly) continue;

			mentions.push({
				id: link ? link.userId : '0x',
				mention: link ? (`<@${link.userId}>` as const) : '0x',
				name: member.name,
				tag: member.tag,
				attacks: member.attacks,
				attackLimit: member.attackLimit + member.bonusAttackLimit
			});
		}

		if (!mentions.length) return [null, []];

		const userIds = unique(mentions.map((m) => m.id).filter((id) => id !== '0x'));

		const users = Object.entries(
			mentions.reduce<{ [key: string]: UserMention[] }>((acc, cur) => {
				acc[cur.mention] ??= []; // eslint-disable-line
				acc[cur.mention].push(cur);
				return acc;
			}, {})
		);

		users.sort(([a], [b]) => {
			if (a === '0x') return 1;
			if (b === '0x') return -1;
			return 0;
		});

		const prefix = 'ends in'; // data.state === 'preparation' ? 'starts in' : 'ends in';
		const ends = data.endTime; // data.state === 'preparation' ? data.startTime : data.endTime;
		const dur = moment(ends).toDate().getTime() - Date.now();
		const warTiming = moment.duration(dur).format('D[d] H[h], m[m]', { trim: 'both mid' });
		const clanNick = await this.client.storage.getNickname(reminder.guild, clan.tag, clan.name);

		const text = [
			`\u200e🔔 **${clanNick} (Capital raid ${prefix} ${warTiming})**`,
			`📨 ${reminder.message}`,
			'',
			users
				.map(([mention, members]) =>
					members
						.map((mem, i) => {
							const ping = i === 0 && mention !== '0x' ? ` ${mention}` : '';
							const hits = ` (${mem.attacks}/${mem.attackLimit})`;
							const prefix = mention === '0x' && i === 0 ? '\n' : '\u200e';
							return `${prefix}${ping} ${escapeMarkdown(mem.name)}${hits}`;
						})
						.join('\n')
				)
				.join('\n')
		].join('\n');

		return [text, userIds];
	}

	private async trigger(schedule: RaidSchedulersEntity) {
		const id = schedule._id.toHexString();
		try {
			const reminder = await this.reminders.findOne({ _id: schedule.reminderId });
			if (!reminder) return await this.delete(schedule, ReminderDeleteReasons.REMINDER_NOT_FOUND);

			if (!this.client.channels.cache.has(reminder.channel))
				return await this.delete(schedule, ReminderDeleteReasons.CHANNEL_NOT_FOUND);

			const data = await this.getLastRaidSeason(schedule.tag);
			if (!data) return this.clear(id);
			if (this.toDate(data.endTime).getTime() < Date.now()) return await this.delete(schedule, ReminderDeleteReasons.TOO_LATE);

			if (this.wasInMaintenance(schedule, data)) {
				this.client.logger.info(
					`Raid reminder shifted [${schedule.tag}] ${schedule.timestamp.toISOString()} => ${moment(data.endTime)
						.toDate()
						.toISOString()}`,
					{ label: 'REMINDER' }
				);
				return await this.schedulers.updateOne(
					{ _id: schedule._id },
					{ $set: { timestamp: new Date(moment(data.endTime).toDate().getTime() - schedule.duration) } }
				);
			}

			const guild = this.client.guilds.cache.get(reminder.guild);
			if (!guild) return await this.delete(schedule, ReminderDeleteReasons.GUILD_NOT_FOUND);

			const [text, userIds] = await this.getReminderText(reminder, schedule, data);
			if (!text) return await this.delete(schedule, ReminderDeleteReasons.NO_RECIPIENT);

			const channel = this.client.util.hasPermissions(reminder.channel, [
				'SendMessages',
				'UseExternalEmojis',
				'ViewChannel',
				'ManageWebhooks'
			]);
			if (channel) {
				if (channel.isThread) reminder.threadId = channel.channel.id;
				const webhook = reminder.webhook ? new WebhookClient(reminder.webhook) : await this.webhook(channel.parent, reminder);

				for (const content of Util.splitMessage(text)) {
					if (webhook) await this.deliver({ reminder, channel: channel.parent, webhook, content, userIds });
				}
			} else {
				return await this.delete(schedule, ReminderDeleteReasons.CHANNEL_MISSING_PERMISSIONS);
			}
		} catch (error) {
			this.client.logger.error(error, { label: 'REMINDER' });
			return this.clear(id);
		}

		return this.delete(schedule, ReminderDeleteReasons.REMINDER_SENT_SUCCESSFULLY);
	}

	private async deliver({
		reminder,
		channel,
		content,
		userIds,
		webhook
	}: {
		reminder: WithId<RaidRemindersEntity>;
		webhook: WebhookClient;
		content: string;
		userIds: string[];
		channel: TextChannel | NewsChannel | ForumChannel | MediaChannel | null;
	}): Promise<APIMessage | null> {
		try {
			return await webhook.send({
				content,
				allowedMentions: this.allowedMentions(reminder, userIds),
				threadId: reminder.threadId
			});
		} catch (error: any) {
			// Unknown Webhook / Unknown Channel
			if ([10015, 10003].includes(error.code) && channel) {
				const webhook = await this.webhook(channel, reminder);
				if (webhook)
					return webhook.send({
						content,
						allowedMentions: this.allowedMentions(reminder, userIds),
						threadId: reminder.threadId
					});
			}
			throw error;
		}
	}

	private async webhook(channel: TextChannel | NewsChannel | ForumChannel | MediaChannel, reminder: WithId<RaidRemindersEntity>) {
		const webhook = await this.client.storage.getWebhook(channel).catch(() => null);
		if (webhook) {
			reminder.webhook = { id: webhook.id, token: webhook.token! };
			await this.reminders.updateOne({ _id: reminder._id }, { $set: { webhook: { id: webhook.id, token: webhook.token! } } });
			return new WebhookClient({ id: webhook.id, token: webhook.token! });
		}
		return null;
	}

	private allowedMentions(reminder: RaidRemindersEntity, userIds: string[]): MessageMentionOptions {
		const config = this.client.settings.get<{ type: 'optIn' | 'optOut'; raids: string; raidsExclusionUserIds: string[] }>(
			reminder.guild,
			Settings.REMINDER_EXCLUSION,
			{
				type: 'optIn',
				raidsExclusionUserIds: []
			}
		);

		const guild = this.client.guilds.cache.get(reminder.guild);
		if (!config.raids || !guild) return { parse: ['users'] };

		if (config.type === 'optIn') {
			return { parse: [], users: userIds.filter((id) => config.raidsExclusionUserIds.includes(id)) };
		}

		return { parse: [], users: userIds.filter((id) => !config.raidsExclusionUserIds.includes(id)) };
	}

	private async _refresh() {
		const cursor = this.schedulers.find({ timestamp: { $lt: new Date(Date.now() + this.refreshRate) } });

		const now = new Date().getTime();
		for await (const schedule of cursor) {
			if (schedule.triggered) continue;
			if (!this.client.guilds.cache.has(schedule.guild)) continue;
			if (this.queued.has(schedule._id.toHexString())) continue;

			if (this.client.settings.hasCustomBot(schedule.guild) && !this.client.isCustom()) continue;

			if (schedule.timestamp.getTime() < now) {
				this.trigger(schedule);
			} else {
				this.queue(schedule);
			}
		}
	}
}

interface UserMention {
	id: string;
	mention: string;
	name: string;
	tag: string;
	attacks: number;
	attackLimit: number;
}
