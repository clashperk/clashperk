import { MessageEmbed, Collection, TextChannel, PermissionString, ThreadChannel } from 'discord.js';
import { ClanWar, ClanWarMember, WarClan } from 'clashofclans.js';
import { TOWN_HALLS, EMOJIS, WAR_STARS, BLUE_NUMBERS, ORANGE_NUMBERS } from '../util/Emojis';
import { Collections } from '../util/Constants';
import { APIMessage } from 'discord-api-types/v9';
import { Client } from '../struct/Client';
import { Util } from '../util';
import { ObjectId } from 'mongodb';
import moment from 'moment';

const states: { [key: string]: number } = {
	preparation: 16745216,
	inWar: 16345172
};

const results: { [key: string]: number } = {
	won: 3066993,
	lost: 15158332,
	tied: 5861569
};

export default class ClanWarLog {
	public cached: Collection<string, Cache>;
	public collection = this.client.db.collection(Collections.CLAN_WAR_LOGS);

	public constructor(private readonly client: Client) {
		this.cached = new Collection();
	}

	public async exec(tag: string, data: PayLoad) {
		const clans = this.cached.filter((d) => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(cache, data);
		}
		return clans.clear();
	}

	private async permissionsFor(cache: Cache, data: PayLoad) {
		const permissions: PermissionString[] = [
			'READ_MESSAGE_HISTORY',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel | ThreadChannel;
			if (channel.isThread() && (channel.locked || !channel.permissionsFor(this.client.user!)?.has('SEND_MESSAGES_IN_THREADS')))
				return;
			if (channel.permissionsFor(this.client.user!)?.has(permissions)) {
				if (channel.isThread() && channel.archived && !(await this.unarchive(channel))) return;
				return this.getWarType(cache, channel, data);
			}
		}
	}

	private async unarchive(thread: ThreadChannel) {
		if (!(thread.editable && thread.manageable)) return null;
		return thread.edit({ autoArchiveDuration: 'MAX', archived: false, locked: false });
	}

	private async getWarType(cache: Cache, channel: TextChannel | ThreadChannel, data: PayLoad) {
		if (data.warTag && cache.rounds[data.round]?.warTag === data.warTag) {
			return this.handleMessage(cache, channel, cache.rounds[data.round]?.messageID ?? null, data);
		} else if (data.warTag) {
			return this.handleMessage(cache, channel, null, data);
		}

		if (data.uid === cache.uid) {
			return this.handleMessage(cache, channel, cache.messageID ?? null, data);
		}

		return this.handleMessage(cache, channel, null, data);
	}

	private async handleMessage(cache: Cache, channel: TextChannel | ThreadChannel, messageID: string | null, data: PayLoad) {
		if (!data.warTag && data.remaining.length && data.state === 'warEnded') {
			const embed = this.getRemaining(data);
			try {
				if (embed) await channel.send({ embeds: [embed] });
			} catch (error) {
				this.client.logger.warn(error, { label: 'WAR_REMAINING_MESSAGE' });
			}
		}

		if (!messageID) {
			const msg = await this.send(channel, data);
			return this.mutate(cache, data, msg);
		}

		const msg = await this.edit(channel, messageID, data);
		return this.mutate(cache, data, msg);
	}

	private async send(channel: TextChannel | ThreadChannel, data: PayLoad) {
		const embed = this.embed(data);
		return Util.sendMessage(this.client, channel.id, { embeds: [embed.toJSON()] }).catch(() => null);
	}

	private async edit(channel: TextChannel | ThreadChannel, messageID: string, data: PayLoad) {
		const embed = this.embed(data);
		return Util.editMessage(this.client, channel.id, messageID, { embeds: [embed.toJSON()] }).catch((error) => {
			if (error.code === 10008) {
				return this.send(channel, data);
			}
			return null;
		});
	}

	private async mutate(cache: Cache, data: PayLoad, message: APIMessage | null) {
		if (!message) {
			if (cache.messageID) delete cache.messageID;
			if (data.warTag) cache.rounds[data.round] = { warTag: data.warTag, messageID: null, round: data.round };
			return this.collection.updateOne({ clanId: new ObjectId(cache._id) }, { $set: { uid: data.uid }, $inc: { failed: 1 } });
		}

		if (data.warTag) {
			cache.rounds[data.round] = { warTag: data.warTag, messageID: message.id, round: data.round };

			return this.collection.updateOne(
				{ clanId: new ObjectId(cache._id) },
				{
					$set: {
						updatedAt: new Date(),
						failed: 0,
						[`rounds.${data.round}`]: { warTag: data.warTag, messageID: message.id, round: data.round }
					}
				}
			);
		}

		cache.uid = data.uid;
		cache.messageID = message.id;
		return this.collection.updateOne(
			{ clanId: new ObjectId(cache._id) },
			{ $set: { messageID: message.id, uid: data.uid, updatedAt: new Date(), failed: 0 } }
		);
	}

	private embed(data: PayLoad) {
		if (data.warTag) return this.getLeagueWarEmbed(data);
		return this.getRegularWarEmbed(data);
	}

	private getRegularWarEmbed(data: PayLoad) {
		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(this.clanURL(data.clan.tag))
			.setThumbnail(data.clan.badgeUrls.small);
		if (data.state === 'preparation') {
			const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
			embed
				.setColor(states[data.state])
				.setDescription(
					[
						'**War Against**',
						`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
						'',
						'**War State**',
						'Preparation Day',
						`War Start Time: ${Util.getRelativeTime(startTimestamp)}`,
						'',
						'**War Size**',
						`${data.teamSize} vs ${data.teamSize}`
					].join('\n')
				);
			embed.setTimestamp();
		}

		if (data.state === 'inWar') {
			const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
			embed
				.setColor(states[data.state])
				.setDescription(
					[
						'**War Against**',
						`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
						'',
						'**War State**',
						'Battle Day',
						`End Time: ${Util.getRelativeTime(endTimestamp)}`,
						'',
						'**War Size**',
						`${data.teamSize} vs ${data.teamSize}`,
						'',
						'**War Stats**',
						`${this.getLeaderBoard(data.clan, data.opponent)}`
					].join('\n')
				);

			if (data.recent?.length) {
				const max = Math.max(...data.recent.map((atk) => atk.attacker.destructionPercentage));
				const pad = max === 100 ? 4 : 3;
				embed.addField(
					'Recent Attacks',
					[
						...data.recent.map(({ attacker, defender }) => {
							const name = Util.escapeMarkdown(attacker.name);
							const stars = this.getStars(attacker.oldStars, attacker.stars);
							const destruction: string = Math.floor(attacker.destructionPercentage)
								.toString()
								.concat('%')
								.padStart(pad, ' ');
							return `${stars} \`\u200e${destruction}\` ${BLUE_NUMBERS[attacker.mapPosition]}${
								ORANGE_NUMBERS[attacker.townHallLevel]
							}${EMOJIS.VS}${BLUE_NUMBERS[defender.mapPosition]}${ORANGE_NUMBERS[defender.townHallLevel]} ${name}`;
						})
					].join('\n')
				);
			}
			embed.setTimestamp();
		}

		if (data.state === 'warEnded') {
			embed
				.setColor(results[data.result])
				.setDescription(
					[
						'**War Against**',
						`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
						'',
						'**War State**',
						'War Ended',
						'',
						'**War Size**',
						`${data.teamSize} vs ${data.teamSize}`,
						'',
						'**War Stats**',
						`${this.getLeaderBoard(data.clan, data.opponent)}`
					].join('\n')
				);
			embed.setFooter({ text: 'Ended' }).setTimestamp();
		}

		embed.setDescription(
			[
				embed.description,
				'',
				'**Rosters**',
				`${Util.escapeMarkdown(data.clan.name)}`,
				`${this.getRoster(data.clan.rosters)}`,
				'',
				`${Util.escapeMarkdown(data.opponent.name)}`,
				`${this.getRoster(data.opponent.rosters)}`
			].join('\n')
		);

		return embed;
	}

	private getRemaining(data: PayLoad) {
		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setThumbnail(data.clan.badgeUrls.small)
			.setURL(this.clanURL(data.clan.tag))
			.setDescription(
				[
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`
				].join('\n')
			);
		const twoRem = data.remaining
			.filter((m) => !m.attacks)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`);
		const oneRem = data.remaining
			.filter((m) => m.attacks?.length === 1)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`);

		const friendly = data.attacksPerMember === 1;
		if (twoRem.length) {
			const chunks = Util.splitMessage(twoRem.join('\n'), { maxLength: 1000 });
			chunks.map((chunk, i) => embed.addField(i === 0 ? `${friendly ? 1 : 2} Missed Attacks` : '\u200b', chunk));
		}

		if (oneRem.length && !friendly) {
			const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
			chunks.map((chunk, i) => embed.addField(i === 0 ? '1 Missed Attacks' : '\u200b', chunk));
		}

		if ((oneRem.length && !friendly) || twoRem.length) return embed;
		return null;
	}

	private getLeagueWarEmbed(data: PayLoad) {
		const { clan, opponent } = data;
		const embed = new MessageEmbed()
			.setTitle(`\u200e${clan.name} (${clan.tag})`)
			.setURL(this.clanURL(clan.tag))
			.setThumbnail(clan.badgeUrls.small)
			.addField('War Against', `\u200e[${Util.escapeMarkdown(opponent.name)} (${opponent.tag})](${this.clanURL(opponent.tag)})`)
			.addField('Team Size', `${data.teamSize}`);

		if (data.state === 'inWar') {
			const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addField('War State', ['Battle Day', `End Time: ${Util.getRelativeTime(endTimestamp)}`].join('\n'));
			embed.addField('War Stats', this.getLeaderBoard(clan, opponent));
		}

		if (data.state === 'preparation') {
			const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addField('War State', ['Preparation Day', `War Start Time: ${Util.getRelativeTime(startTimestamp)}`].join('\n'));
		}

		if (data.state === 'warEnded') {
			embed.setColor(results[data.result]);
			embed.addField('War State', 'War Ended').addField('War Stats', this.getLeaderBoard(clan, opponent));
		}

		const rosters = [
			`\u200e${clan.name}`,
			`${this.getRoster(clan.rosters)}`,
			'',
			`\u200e${opponent.name}`,
			`${this.getRoster(opponent.rosters)}`
		];

		if (rosters.join('\n').length > 1024) {
			embed.addField('Rosters', rosters.slice(0, 2).join('\n'));
			embed.addField('\u200e', rosters.slice(-2).join('\n'));
		} else {
			embed.addField('Rosters', rosters.join('\n'));
		}

		if (data.recent?.length) {
			const max = Math.max(...data.recent.map((atk) => atk.attacker.destructionPercentage));
			const pad = max === 100 ? 4 : 3;
			embed.addField(
				'Recent Attacks',
				[
					...data.recent.map(({ attacker, defender }) => {
						const name = Util.escapeMarkdown(attacker.name);
						const stars = this.getStars(attacker.oldStars, attacker.stars);
						const destruction: string = Math.floor(attacker.destructionPercentage).toString().concat('%').padStart(pad, ' ');
						return `${stars} \`\u200e${destruction}\` ${BLUE_NUMBERS[attacker.mapPosition]}${
							ORANGE_NUMBERS[attacker.townHallLevel]
						}${EMOJIS.VS}${BLUE_NUMBERS[defender.mapPosition]}${ORANGE_NUMBERS[defender.townHallLevel]} ${name}`;
					})
				].join('\n')
			);
		}

		if (data.remaining.length) {
			const oneRem = data.remaining
				.sort((a, b) => a.mapPosition - b.mapPosition)
				.map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`);

			if (oneRem.length) {
				const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
				chunks.map((chunk, i) => embed.addField(i === 0 ? 'Missed Attacks' : '\u200e', chunk));
			}
		}

		embed.setFooter({ text: `Round #${data.round}` }).setTimestamp();
		return embed;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private getLeaderBoard(clan: WarClan, opponent: WarClan) {
		return [
			`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars
				.toString()
				.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.SWORD} \u2002 \`\u200e ${opponent.attacks
				.toString()
				.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
				EMOJIS.FIRE
			} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
		].join('\n');
	}

	private getStars(oldStars: number, newStars: number) {
		if (oldStars > newStars) {
			return [WAR_STARS.OLD.repeat(newStars), WAR_STARS.EMPTY.repeat(3 - newStars)].filter((stars) => stars.length).join('');
		}
		return [WAR_STARS.OLD.repeat(oldStars), WAR_STARS.NEW.repeat(newStars - oldStars), WAR_STARS.EMPTY.repeat(3 - newStars)]
			.filter((stars) => stars.length)
			.join('');
	}

	private getRoster(townHalls: Roster[]) {
		return this.chunk(townHalls)
			.map((chunks) => {
				const list = chunks.map((th) => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}`);
				return list.join(' ');
			})
			.join('\n');
	}

	private chunk(items: Roster[] = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	public async init() {
		await this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } }).forEach((data) => {
			this.cached.set((data.clanId as ObjectId).toHexString(), {
				tag: data.tag,
				_id: data.clanId,
				guild: data.guild,
				uid: data.uid,
				channel: data.channel,
				rounds: data.rounds || {},
				messageID: data.messageID
			});
		});
	}

	public async add(id: string) {
		const data = await this.collection.findOne({ clanId: new ObjectId(id) });
		if (!data) return null;

		this.cached.set(id, {
			tag: data.tag,
			_id: data.clanId,
			guild: data.guild,
			uid: data.uid,
			channel: data.channel,
			rounds: data.rounds || {},
			messageID: data.messageID
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}

interface Roster {
	total: number;
	level: number;
}

interface Attacker {
	name: string;
	stars: number;
	oldStars: number;
	mapPosition: number;
	townHallLevel: number;
	destructionPercentage: number;
}

interface Defender {
	mapPosition: number;
	townHallLevel: number;
}

interface Recent {
	attacker: Attacker;
	defender: Defender;
}

interface PayLoad extends ClanWar {
	recent?: Recent[];
	result: string;
	round: number;
	uid: string;
	warTag?: string;
	attacksPerMember: number;
	remaining: ClanWarMember[];
	clan: WarClan & { rosters: Roster[] };
	opponent: WarClan & { rosters: Roster[] };
}

interface Cache {
	guild: string;
	channel: string;
	tag: string;
	rounds: any;
	uid: string;
	_id: ObjectId;
	messageID?: string;
}
