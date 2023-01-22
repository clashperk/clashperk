import { ClanWar } from 'clashofclans.js';
import { APIMessage, ForumChannel, Guild, NewsChannel, TextChannel, WebhookClient } from 'discord.js';
import moment from 'moment';
import { Collection, ObjectId, WithId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import { ORANGE_NUMBERS } from '../util/Emojis.js';
import { Util } from '../util/index.js';
import { Client } from './Client.js';

// fetch links from our db
export default class ClanWarScheduler {
	protected schedulers!: Collection<Schedule>;
	protected reminders!: Collection<Reminder>;
	private readonly refreshRate: number;
	private readonly queued = new Map<string, NodeJS.Timeout>();

	public constructor(private readonly client: Client) {
		this.refreshRate = 5 * 60 * 1000;
		this.schedulers = this.client.db.collection(Collections.SCHEDULERS);
		this.reminders = this.client.db.collection(Collections.REMINDERS);
	}

	public async init() {
		this.schedulers
			.watch(
				[
					{
						$match: { operationType: { $in: ['insert', 'update', 'delete'] } }
					}
				],
				{ fullDocument: 'updateLookup' }
			)
			.on('change', (change) => {
				if (['insert'].includes(change.operationType)) {
					const schedule = change.fullDocument;
					if (schedule && schedule.timestamp.getTime() < Date.now() + this.refreshRate) {
						this.queue(schedule);
					}
				}

				if (['delete', 'update'].includes(change.operationType)) {
					const id: string = change.documentKey!._id.toHexString();
					if (this.queued.has(id)) this.clear(id);

					if (change.operationType === 'update') {
						const schedule = change.fullDocument;
						if (schedule && !schedule.triggered && schedule.timestamp.getTime() < Date.now() + this.refreshRate) {
							this.queue(schedule);
						}
					}
				}
			});

		await this._refresh();
		setInterval(this._refresh.bind(this), this.refreshRate).unref();
	}

	public async create(reminder: Reminder) {
		for (const tag of reminder.clans) {
			const wars = await this.client.http.getCurrentWars(tag);
			const rand = Math.random();
			for (const data of wars) {
				if (!data.ok) continue;
				if (['notInWar', 'warEnded'].includes(data.state)) continue;
				const endTime = moment(data.endTime).toDate();

				const ms = endTime.getTime() - reminder.duration;
				if (Date.now() > new Date(ms).getTime()) continue;

				await this.schedulers.insertOne({
					_id: new ObjectId(),
					guild: reminder.guild,
					tag: data.clan.tag,
					name: data.clan.name,
					warTag: data.warTag,
					isFriendly: Boolean(data.isFriendly),
					duration: reminder.duration,
					reminderId: reminder._id,
					source: `bot_${this.client.shard?.ids[0] ?? 0}_${rand}`,
					triggered: false,
					timestamp: new Date(ms),
					createdAt: new Date()
				});
			}
		}
	}

	private queue(schedule: Schedule) {
		this.queued.set(
			schedule._id.toHexString(),
			setTimeout(() => {
				this.trigger(schedule);
			}, schedule.timestamp.getTime() - Date.now())
		);
	}

	private async delete(schedule: Schedule) {
		this.clear(schedule._id.toHexString());
		return this.schedulers.updateOne({ _id: schedule._id }, { $set: { triggered: true } });
	}

	private clear(id: string) {
		const timeoutId = this.queued.get(id);
		if (timeoutId) clearTimeout(timeoutId);
		return this.queued.delete(id);
	}

	private async getClanMembers(tag: string) {
		const data = await this.client.http.clan(tag);
		return data.ok ? data.memberList : [];
	}

	private wasInMaintenance(schedule: Schedule, data: ClanWar) {
		const timestamp = moment(data.endTime).toDate().getTime() - schedule.duration;
		return timestamp > schedule.timestamp.getTime();
	}

	public async getReminderText(
		reminder: Pick<Reminder, 'roles' | 'remaining' | 'townHalls' | 'guild' | 'message' | 'smartSkip'>,
		schedule: Pick<Schedule, 'tag' | 'warTag'>,
		data: ClanWar,
		_guild: Guild
	) {
		const clanMembers = reminder.roles.length === 4 ? [] : await this.getClanMembers(schedule.tag);
		const clan = data.clan.tag === schedule.tag ? data.clan : data.opponent;
		const attacksPerMember = data.attacksPerMember || 1;
		if (reminder.smartSkip && clan.destructionPercentage >= 100) return null;

		const members = clan.members
			.filter((mem) => {
				if (schedule.warTag && !mem.attacks?.length) return true;
				return reminder.remaining.includes(attacksPerMember - (mem.attacks?.length ?? 0));
			})
			.filter((mem) => reminder.townHalls.includes(mem.townhallLevel))
			.filter((mem) => {
				if (reminder.roles.length === 4) return true;
				const clanMember = clanMembers.find((m) => m.tag === mem.tag);
				return clanMember && reminder.roles.includes(clanMember.role);
			});
		if (!members.length) return null;

		const links = await this.client.http.getDiscordLinks(members);
		if (!links.length) return null;

		// const guildMembers = await guild.members.fetch({ user: links.map(({ user }) => user) }).catch(() => null);
		const mentions: UserMention[] = [];

		for (const link of links) {
			const member = members.find((mem) => mem.tag === link.tag)!;
			// const mention = guildMembers?.get(link.user) ?? `<@${link.user}>`;
			const mention = `<@${link.user}>`;
			mentions.push({
				id: link.user,
				mention: mention.toString(),
				name: member.name,
				tag: member.tag,
				position: member.mapPosition,
				townHallLevel: member.townhallLevel,
				attacks: member.attacks?.length ?? 0
			});
		}

		if (!mentions.length) return null;
		mentions.sort((a, b) => a.position - b.position);

		const users = Object.entries(
			mentions.reduce<{ [key: string]: UserMention[] }>((acc, cur) => {
				if (!acc.hasOwnProperty(cur.mention)) acc[cur.mention] = [];
				acc[cur.mention]!.push(cur);
				return acc;
			}, {})
		);

		const prefix = data.state === 'preparation' ? 'starts in' : 'ends in';
		const dur =
			moment(data.state === 'preparation' ? data.startTime : data.endTime)
				.toDate()
				.getTime() - Date.now();
		const warTiming = moment.duration(dur).format('H[h], m[m], s[s]', { trim: 'both mid' });

		return [
			`\u200e🔔 **${clan.name} (War ${prefix} ${warTiming})**`,
			`📨 ${reminder.message}`,
			'',
			users
				.map(([mention, members]) =>
					members
						.map((mem, i) => {
							const ping = i === 0 ? ` ${mention}` : '';
							const hits =
								data.state === 'preparation' || attacksPerMember === 1 ? '' : ` (${mem.attacks}/${attacksPerMember})`;
							return `\u200e${ORANGE_NUMBERS[mem.townHallLevel]!}${ping} ${mem.name}${hits}`;
						})
						.join('\n')
				)
				.join('\n')
		].join('\n');
	}

	private warEndReminderText(
		reminder: Pick<Reminder, 'roles' | 'remaining' | 'townHalls' | 'guild' | 'message'>,
		schedule: Pick<Schedule, 'tag' | 'warTag'>,
		data: ClanWar
	) {
		const clan = data.clan.tag === schedule.tag ? data.clan : data.opponent;
		return [`\u200e🔔 **${clan.name} (War has ended)**`, `📨 ${reminder.message}`].join('\n');
	}

	private async trigger(schedule: Schedule) {
		const id = schedule._id.toHexString();
		try {
			const reminder = await this.reminders.findOne({ _id: schedule.reminderId });
			if (!reminder) return await this.delete(schedule);
			if (!this.client.channels.cache.has(reminder.channel)) return await this.delete(schedule);
			const warType = schedule.warTag ? 'cwl' : schedule.isFriendly ? 'friendly' : 'normal';
			if (!reminder.warTypes.includes(warType)) return await this.delete(schedule);

			const data = schedule.warTag
				? await this.client.http.clanWarLeagueWar(schedule.warTag)
				: await this.client.http.currentClanWar(schedule.tag);
			if (!data.ok) return this.clear(id);

			if (data.state === 'notInWar') return await this.delete(schedule);
			if (data.state === 'warEnded' && schedule.duration !== 0) return await this.delete(schedule);

			if (this.wasInMaintenance(schedule, data)) {
				this.client.logger.info(
					`Reminder shifted [${schedule.tag}] ${schedule.timestamp.toISOString()} => ${moment(data.endTime)
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
			if (!guild) return await this.delete(schedule);

			const text =
				schedule.duration === 0
					? this.warEndReminderText(reminder, schedule, data)
					: await this.getReminderText(reminder, schedule, data, guild);
			if (!text) return await this.delete(schedule);

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
					if (webhook) await this.deliver({ reminder, channel: channel.parent, webhook, content });
				}
			}
		} catch (error) {
			this.client.logger.error(error, { label: 'REMINDER' });
			return this.clear(id);
		}

		return this.delete(schedule);
	}

	private async deliver({
		reminder,
		channel,
		content,
		webhook
	}: {
		reminder: WithId<Reminder>;
		webhook: WebhookClient;
		content: string;
		channel: TextChannel | NewsChannel | ForumChannel | null;
	}): Promise<APIMessage | null> {
		try {
			return await webhook.send({
				content,
				allowedMentions: { parse: reminder.duration === 0 ? ['users', 'roles'] : ['users'] },
				threadId: reminder.threadId
			});
		} catch (error: any) {
			// Unknown Webhook / Unknown Channel
			if ([10015, 10003].includes(error.code) && channel) {
				const webhook = await this.webhook(channel, reminder);
				if (webhook) {
					return webhook.send({
						content,
						allowedMentions: { parse: reminder.duration === 0 ? ['users', 'roles'] : ['users'] },
						threadId: reminder.threadId
					});
				}
			}
			throw error;
		}
	}

	private async webhook(channel: TextChannel | NewsChannel | ForumChannel, reminder: WithId<Reminder>) {
		const webhook = await this.client.storage.getWebhook(channel).catch(() => null);
		if (webhook) {
			reminder.webhook = { id: webhook.id, token: webhook.token! };
			await this.reminders.updateOne({ _id: reminder._id }, { $set: { webhook: { id: webhook.id, token: webhook.token! } } });
			return new WebhookClient({ id: webhook.id, token: webhook.token! });
		}
		return null;
	}

	private async _refresh() {
		const schedulers = await this.schedulers.find({ timestamp: { $lt: new Date(Date.now() + this.refreshRate) } }).toArray();

		const now = new Date().getTime();
		for (const schedule of schedulers) {
			if (schedule.triggered) continue;
			if (!this.client.guilds.cache.has(schedule.guild)) continue;
			if (this.queued.has(schedule._id.toHexString())) continue;

			if (schedule.timestamp.getTime() < now) {
				this.trigger(schedule);
			} else {
				this.queue(schedule);
			}
		}
	}
}

export interface Schedule {
	_id: ObjectId;
	guild: string;
	name: string;
	tag: string;
	warTag?: string;
	duration: number;
	source?: string;
	reminderId: ObjectId;
	isFriendly: boolean;
	triggered: boolean;
	timestamp: Date;
	createdAt: Date;
}

export interface Reminder {
	_id: ObjectId;
	guild: string;
	channel: string;
	message: string;
	duration: number;
	webhook?: { id: string; token: string } | null;
	threadId?: string;
	roles: string[];
	townHalls: number[];
	smartSkip: boolean;
	warTypes: string[];
	clans: string[];
	remaining: number[];
	createdAt: Date;
}

interface UserMention {
	position: number;
	id: string;
	mention: string;
	name: string;
	tag: string;
	townHallLevel: number;
	attacks: number;
}
