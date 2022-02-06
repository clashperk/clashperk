import { Collections } from '../util/Constants';
import { Collection, ObjectId } from 'mongodb';
import { TextChannel } from 'discord.js';
import Client from './Client';
import moment from 'moment';

export interface ReminderTemp {
	_id: ObjectId;
	guild: string;
	tag: string;
	warTag?: string;
	reminderId: ObjectId;
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
			$match: {
				operationType: { $in: ['insert', 'update', 'delete'] }
			}
		}], { fullDocument: 'updateLookup' }).on('change', change => {
			if (['insert'].includes(change.operationType)) {
				const reminder = change.fullDocument!;
				if (reminder.timestamp.getTime() < (Date.now() + this.refreshRate)) {
					this.queue(reminder);
				}
			}

			if (['delete', 'update'].includes(change.operationType)) {
				// @ts-expect-error
				const id: string = change.documentKey!._id.toHexString();
				if (this.queued.has(id)) {
					const timeoutId = this.queued.get(id);
					if (timeoutId) clearTimeout(timeoutId);
					this.queued.delete(id);
				}

				if (change.operationType === 'update') {
					const reminder = change.fullDocument!;
					if (reminder.timestamp.getTime() < (Date.now() + this.refreshRate)) {
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
				if (Date.now() > new Date(endTime.getTime() - reminder.duration).getTime()) continue;

				await this.collection.insertOne({
					guild: reminder.guild,
					tag: data.clan.tag,
					warTag: data.warTag,
					reminderId: reminder._id,
					timestamp: new Date(endTime.getTime() - reminder.duration),
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
		const timeoutId = this.queued.get(reminder._id.toHexString());
		if (timeoutId) clearTimeout(timeoutId);
		this.queued.delete(reminder._id.toHexString());
		return this.collection.deleteOne({ _id: reminder._id });
	}

	private async getClanMembers(tag: string) {
		const data = await this.client.http.clan(tag);
		return data.ok ? data.memberList : [];
	}

	private async trigger(reminder: ReminderTemp) {
		try {
			const rem = await this.client.db.collection<Reminder>(Collections.REMINDERS).findOne({ _id: reminder.reminderId });
			if (!rem) return null;
			if (!this.client.channels.cache.has(rem.channel)) return null;

			const data = reminder.warTag
				? await this.client.http.clanWarLeagueWar(reminder.warTag)
				: await this.client.http.currentClanWar(reminder.tag);
			if (['notInWar', 'warEnded'].includes(data.state)) return null;

			const clanMembers = rem.roles.length === 4 ? [] : await this.getClanMembers(reminder.tag);
			const clan = data.clan.tag === reminder.tag ? data.clan : data.opponent;
			const attacksPerMember = data.attacksPerMember || 1;

			const members = clan.members.filter(
				mem => rem.remaining.includes(attacksPerMember - (mem.attacks?.length ?? 0))
			).filter(
				mem => rem.townHalls.includes(mem.townhallLevel)
			).filter(
				mem => {
					if (rem.roles.length === 4) return true;
					const clanMember = clanMembers.find(m => m.tag === mem.tag);
					return clanMember && rem.roles.includes(clanMember.role);
				}
			);
			if (!members.length) return null;

			const links = await this.client.http.getDiscordLinks(members);
			if (!links.length) return null;

			const guild = this.client.guilds.cache.get(rem.guild);
			if (!guild) return null;

			const guildMembers = await guild.members.fetch({ user: links.map(({ user }) => user) }).catch(() => null);
			const mentions: { position: number; id: string; name: string }[] = [];

			for (const link of links) {
				const member = members.find(mem => mem.tag === link.tag)!;
				const mention = guildMembers?.get(link.user)?.toString() ?? `<@${link.user}>`;
				mentions.push({
					id: mention,
					name: member.name,
					position: member.mapPosition
				});
			}

			if (!mentions.length) return null;
			mentions.sort((a, b) => a.position - b.position);

			const users = Object.entries(
				mentions.reduce((acc, cur) => {
					if (!acc.hasOwnProperty(cur.id)) acc[cur.id] = [];
					acc[cur.id].push(cur);
					return acc;
				}, {} as { [key: string]: { position: number; id: string; name: string }[] })
			);

			const prefix = data.state === 'preparation' ? 'starts in' : 'ends in';
			const dur = moment(data.state === 'preparation' ? data.startTime : data.endTime).toDate().getTime() - Date.now();
			const warTiming = moment.duration(dur).format('H[h], m[m], s[s]', { trim: 'both mid' });

			const content = [
				`📨 ${rem.message}`,
				'\u200b',
				...users.map(([mention, members]) => `${mention} (${members.map(mem => mem.name).join(', ')})`),
				'\u200b',
				`**${clan.name} (War ${prefix} ${warTiming})**`
			].join('\n');

			const channel = this.client.channels.cache.get(rem.channel) as TextChannel | null;
			if (channel?.permissionsFor(this.client.user!)?.has(['SEND_MESSAGES'])) {
				await channel.send({ content, allowedMentions: { parse: ['users'] } });
			}
		} catch (error) {
			this.client.logger.error('Reminder Failed', { label: 'REMINDER' });
		}

		return this.delete(reminder);
	}

	private async _refresh() {
		const reminders = await this.collection.find({
			timestamp: { $lt: new Date(Date.now() + this.refreshRate) }
		}).toArray();

		const now = new Date().getTime();
		for (const reminder of reminders) {
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
