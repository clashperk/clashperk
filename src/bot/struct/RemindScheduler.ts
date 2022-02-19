import { Collections } from '../util/Constants';
import { Collection, ObjectId } from 'mongodb';
import { TextChannel } from 'discord.js';
import Client from './Client';
import moment from 'moment';
import { Util } from '../util/Util';
import { ORANGE_NUMBERS } from '../util/NumEmojis';
import { ClanWar } from 'clashofclans.js';

export default class RemindScheduler {
	protected collection!: Collection<ReminderTemp>;

	private readonly refreshRate: number;
	private readonly queued = new Map();

	public constructor(private readonly client: Client) {
		this.refreshRate = 5 * 60 * 1000;
		this.collection = this.client.db.collection(Collections.REMINDERS_TEMP);
	}

	public async init() {
		this.collection.watch([{
			$match: { operationType: { $in: ['insert', 'update', 'delete'] } }
		}], { fullDocument: 'updateLookup' }).on('change', change => {
			if (['insert'].includes(change.operationType)) {
				const reminder = change.fullDocument;
				if (reminder && reminder.timestamp.getTime() < (Date.now() + this.refreshRate)) {
					this.queue(reminder);
				}
			}

			if (['delete', 'update'].includes(change.operationType)) {
				// @ts-expect-error
				const id: string = change.documentKey!._id.toHexString();
				if (this.queued.has(id)) this.clear(id);

				if (change.operationType === 'update') {
					const reminder = change.fullDocument;
					if (reminder && reminder.timestamp.getTime() < (Date.now() + this.refreshRate)) {
						this.queue(reminder);
					}
				}
			}
		});

		await this._refresh();
		setInterval(this._refresh.bind(this), this.refreshRate);
	}

	public async create(reminder: Reminder) {
		for (const tag of reminder.clans) {
			const wars = await this.client.http.getCurrentWars(tag);
			for (const data of wars) {
				if (!data.ok) continue;
				if (['notInWar', 'warEnded'].includes(data.state)) continue;
				const endTime = moment(data.endTime).toDate();

				const ms = endTime.getTime() - reminder.duration;
				if (Date.now() > new Date(ms).getTime()) continue;

				await this.collection.insertOne({
					guild: reminder.guild,
					tag: data.clan.tag,
					name: data.clan.name,
					warTag: data.warTag,
					duration: reminder.duration,
					reminderId: reminder._id,
					triggered: false,
					timestamp: new Date(ms),
					createdAt: new Date()
				});
			}
		}
	}

	private queue(reminder: ReminderTemp) {
		this.queued.set(
			reminder._id.toHexString(),
			setTimeout(() => {
				this.trigger(reminder);
			}, reminder.timestamp.getTime() - Date.now())
		);
	}

	private async delete(reminder: ReminderTemp) {
		this.clear(reminder._id.toHexString());
		return this.collection.deleteOne({ _id: reminder._id });
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

	private wasInMaintenance(reminder: ReminderTemp, data: ClanWar) {
		const timestamp = moment(data.endTime).toDate().getTime() - reminder.duration;
		return timestamp > reminder.timestamp.getTime();
	}

	private async trigger(reminder: ReminderTemp) {
		const id = reminder._id.toHexString();
		try {
			const rem = await this.client.db.collection<Reminder>(Collections.REMINDERS).findOne({ _id: reminder.reminderId });
			if (!rem) return this.delete(reminder);
			if (!this.client.channels.cache.has(rem.channel)) return this.delete(reminder);

			const data = reminder.warTag
				? await this.client.http.clanWarLeagueWar(reminder.warTag)
				: await this.client.http.currentClanWar(reminder.tag);
			if (!data.ok) return this.clear(id);
			if (['notInWar', 'warEnded'].includes(data.state)) return this.delete(reminder);

			if (this.wasInMaintenance(reminder, data)) {
				this.client.logger.info(
					`Reminder shifted ${reminder.timestamp.toISOString()} => ${moment(data.endTime).toDate().toISOString()}`,
					{ label: 'REMINDER' }
				);
				return this.collection.updateOne(
					{ _id: reminder._id },
					{ $set: { timestamp: new Date(moment(data.endTime).toDate().getTime() - reminder.duration) } }
				);
			}

			const clanMembers = rem.roles.length === 4 ? [] : await this.getClanMembers(reminder.tag);
			const clan = data.clan.tag === reminder.tag ? data.clan : data.opponent;
			const attacksPerMember = data.attacksPerMember || 1;

			const members = clan.members.filter(
				mem => {
					if (reminder.warTag && !mem.attacks?.length) return true;
					return rem.remaining.includes(attacksPerMember - (mem.attacks?.length ?? 0));
				}
			).filter(
				mem => rem.townHalls.includes(mem.townhallLevel)
			).filter(
				mem => {
					if (rem.roles.length === 4) return true;
					const clanMember = clanMembers.find(m => m.tag === mem.tag);
					return clanMember && rem.roles.includes(clanMember.role);
				}
			);
			if (!members.length) return this.delete(reminder);

			const links = await this.client.http.getDiscordLinks(members);
			if (!links.length) return this.delete(reminder);

			const guild = this.client.guilds.cache.get(rem.guild);
			if (!guild) return this.delete(reminder);

			const guildMembers = await guild.members.fetch({ user: links.map(({ user }) => user) }).catch(() => null);
			const mentions: UserMention[] = [];

			for (const link of links) {
				const member = members.find(mem => mem.tag === link.tag)!;
				const mention = guildMembers?.get(link.user) ?? `<@${link.user}>`;
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

			if (!mentions.length) return this.delete(reminder);
			mentions.sort((a, b) => a.position - b.position);

			const users = Object.entries(
				mentions.reduce((acc, cur) => {
					if (!acc.hasOwnProperty(cur.mention)) acc[cur.mention] = [];
					acc[cur.mention].push(cur);
					return acc;
				}, {} as { [key: string]: UserMention[] })
			);

			const prefix = data.state === 'preparation' ? 'starts in' : 'ends in';
			const dur = moment(data.state === 'preparation' ? data.startTime : data.endTime).toDate().getTime() - Date.now();
			const warTiming = moment.duration(dur).format('H[h], m[m], s[s]', { trim: 'both mid' });

			const text = [
				`🔔 **${clan.name} (War ${prefix} ${warTiming})**`,
				'',
				`📨 ${rem.message}`,
				'',
				'\u200b',
				users.map(([mention, members]) => {
					const mapped = members.map(
						(mem, i) => {
							const ping = i === 0 ? ` ${mention}` : '';
							const hits = (data.state === 'preparation' || attacksPerMember === 1)
								? ''
								: ` (${mem.attacks}/${attacksPerMember})`;
							return `\u200e${ORANGE_NUMBERS[mem.townHallLevel]}${ping} ${mem.name}${hits}`;
						}
					).join('\n');
					return mapped;
				}).join('\n')
			].join('\n');

			const channel = this.client.channels.cache.get(rem.channel) as TextChannel | null;
			if (channel?.permissionsFor(this.client.user!)?.has(['SEND_MESSAGES', 'USE_EXTERNAL_EMOJIS'])) {
				for (const content of Util.splitMessage(text)) {
					await channel.send({ content, allowedMentions: { parse: ['users'] } });
				}
			}
		} catch (error) {
			this.client.logger.error(error, { label: 'REMINDER' });
			return this.clear(id);
		}

		return this.delete(reminder);
	}

	private async _refresh() {
		const reminders = await this.collection.find({
			timestamp: { $lt: new Date(Date.now() + this.refreshRate) }
		}).toArray();

		const now = new Date().getTime();
		for (const reminder of reminders) {
			if (reminder.triggered) continue;
			if (!this.client.guilds.cache.has(reminder.guild)) continue;
			if (this.queued.has(reminder._id.toHexString())) continue;

			if (reminder.timestamp.getTime() < now) {
				this.trigger(reminder);
			} else {
				this.queue(reminder);
			}
		}
	}
}

export interface ReminderTemp {
	_id: ObjectId;
	guild: string;
	name: string;
	tag: string;
	warTag?: string;
	duration: number;
	reminderId: ObjectId;
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
	roles: string[];
	townHalls: number[];
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
