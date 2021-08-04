import { MessageEmbed, Collection, TextChannel, PermissionString, Message, Snowflake } from 'discord.js';
import { ClanWar, ClanWarMember, WarClan } from 'clashofclans.js';
import { BLUE_NUMBERS, ORANGE_NUMBERS } from '../util/NumEmojis';
import { TOWN_HALLS, EMOJIS, WAR_STARS } from '../util/Emojis';
import { Collections } from '../util/Constants';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Util } from '../util/Util';

const states: { [key: string]: number } = {
	preparation: 16745216,
	inWar: 16345172
};

const results: { [key: string]: number } = {
	won: 3066993,
	lost: 15158332,
	tied: 5861569
};

interface Roster {
	total: number;
	level: number;
}

interface WarRes extends ClanWar {
	recent?: {
		attacker: {
			name: string;
			stars: number;
			oldStars: number;
			mapPosition: number;
			townHallLevel: number;
			destructionPercentage: number;
		};
		defender: {
			mapPosition: number;
			townHallLevel: number;
		};
	}[];
	result: string;
	clan: WarClan & { rosters: Roster[] };
	opponent: WarClan & { rosters: Roster[] };
	remaining: ClanWarMember[];
	round: number;
	groupWar: boolean;
	warTag?: string;
	warID: number;
	isFriendly: boolean;
}

export default class ClanWarLog {
	public cached: Collection<string, any>;

	public constructor(private readonly client: Client) {
		this.client = client;
		this.cached = new Collection();
	}

	public async exec(tag: string, data: any) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(id, cache, data);
		}

		return clans.clear();
	}

	private permissionsFor(id: string, cache: any, data: any) {
		const permissions: PermissionString[] = [
			'READ_MESSAGE_HISTORY',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel;
			if (channel.type !== 'GUILD_TEXT') return; // eslint-disable-line
			if (channel.permissionsFor(channel.guild.me!)!.has(permissions, false)) {
				return this.getWarType(id, channel, data);
			}
		}
	}

	private async getWarType(id: string, channel: TextChannel, data: any) {
		const cache = this.cached.get(id);
		if (data.groupWar && cache?.rounds[data.round]?.warTag === data.warTag) {
			return this.handleMessage(id, channel, cache?.rounds[data.round]?.messageID, data);
		} else if (data.groupWar) {
			return this.handleMessage(id, channel, null, data);
		}

		if (data.warID === cache.warID) {
			return this.handleMessage(id, channel, cache.messageID, data);
		}

		return this.handleMessage(id, channel, null, data);
	}

	private async handleMessage(id: string, channel: TextChannel, messageID: Snowflake | null, data: any) {
		if (!data.groupWar && data.remaining.length && data.state === 'warEnded') {
			const embed = this.getRemaining(data);
			try {
				if (embed) await channel.send({ embeds: [embed] });
			} catch (error) {
				this.client.logger.warn(error, { label: 'WAR_REMAINING_MESSAGE' });
			}
		}

		if (!messageID) {
			return this.sendNew(id, channel, data);
		}

		const message = await channel.messages.fetch(messageID, { cache: false })
			.catch(error => {
				this.client.logger.warn(error, { label: 'WAR_FETCH_MESSAGE' });
				if (error.code === 10008) {
					return { deleted: true };
				}

				return null;
			});

		if (!message) return;

		if (message.deleted) {
			return this.sendNew(id, channel, data);
		}

		if (message instanceof Message) {
			return this.edit(id, message, data);
		}
	}

	private async sendNew(id: string, channel: TextChannel, data: any) {
		const embed = this.embed(data);
		const message = await channel.send({ embeds: [embed] }).catch(() => null);
		if (message) await this.updateMessageID(id, data, message.id);
		return message;
	}

	private async edit(id: string, message: Message, data: any) {
		const embed = this.embed(data);

		const updated = await message.edit({ embeds: [embed] })
			.catch(error => {
				if (error.code === 10008) {
					return this.sendNew(id, message.channel as TextChannel, data);
				}
				return null;
			});

		if (updated) {
			await this.client.db.collection(Collections.CLAN_WAR_LOGS).updateOne(
				{ clan_id: new ObjectId(id) },
				{ $set: { updatedAt: new Date() } }
			);
		}

		return updated;
	}

	private embed(data: any) {
		if (data.groupWar) return this.getLeagueWarEmbed(data);
		return this.getRegularWarEmbed(data);
	}

	private getRegularWarEmbed(data: WarRes) {
		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(this.clanURL(data.clan.tag))
			.setThumbnail(data.clan.badgeUrls.small);
		if (data.state === 'preparation') {
			const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
			embed.setColor(states[data.state])
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'Preparation Day',
					`War Start Time: ${Util.getRelativeTime(startTimestamp)}`,
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`
				].join('\n'));
			embed.setTimestamp();
		}

		if (data.state === 'inWar') {
			const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
			embed.setColor(states[data.state])
				.setDescription([
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
				].join('\n'));

			if (data.recent?.length) {
				const max = Math.max(...data.recent.map(atk => atk.attacker.destructionPercentage));
				const pad = max === 100 ? 4 : 3;
				embed.addField('Recent Attacks', [
					...data.recent.map(({ attacker, defender }) => {
						const name = Util.escapeMarkdown(attacker.name);
						const stars = this.getStars(attacker.oldStars, attacker.stars);
						const destruction = Math.floor(attacker.destructionPercentage).toString().concat('%');
						return `${stars} \`\u200e${destruction.padStart(pad, ' ')}\` ${BLUE_NUMBERS[attacker.mapPosition]}${ORANGE_NUMBERS[attacker.townHallLevel]}${EMOJIS.VS}${BLUE_NUMBERS[defender.mapPosition]}${ORANGE_NUMBERS[defender.townHallLevel]} ${name}`;
					})
				].join('\n'));
			}
			embed.setTimestamp();
		}

		if (data.state === 'warEnded') {
			embed.setColor(results[data.result])
				.setDescription([
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
				].join('\n'));
			embed.setFooter('Ended').setTimestamp();
		}

		embed.setDescription([
			embed.description,
			'',
			'**Rosters**',
			`${Util.escapeMarkdown(data.clan.name)}`,
			`${this.getRoster(data.clan.rosters)}`,
			'',
			`${Util.escapeMarkdown(data.opponent.name)}`,
			`${this.getRoster(data.opponent.rosters)}`
		].join('\n'));

		return embed;
	}

	private getRemaining(data: WarRes) {
		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setThumbnail(data.clan.badgeUrls.small)
			.setURL(this.clanURL(data.clan.tag))
			.setDescription([
				'**War Against**',
				`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`
			].join('\n'));
		const twoRem = data.remaining.filter(m => !m.attacks)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map(m => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`);
		const oneRem = data.remaining.filter(m => m.attacks?.length === 1)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map(m => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`);

		const friendly = Boolean(data.isFriendly && oneRem.length === data.teamSize && data.clan.destructionPercentage > 0);
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

	private getLeagueWarEmbed(data: WarRes) {
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
			embed.addField('War State', [
				'Battle Day',
				`End Time: ${Util.getRelativeTime(endTimestamp)}`
			].join('\n'));
			embed.addField('War Stats', this.getLeaderBoard(clan, opponent));
		}

		if (data.state === 'preparation') {
			const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addField('War State', [
				'Preparation Day',
				`War Start Time: ${Util.getRelativeTime(startTimestamp)}`
			].join('\n'));
		}

		if (data.state === 'warEnded') {
			embed.setColor(results[data.result]);
			embed.addField('War State', 'War Ended')
				.addField('War Stats', this.getLeaderBoard(clan, opponent));
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
			const max = Math.max(...data.recent.map(atk => atk.attacker.destructionPercentage));
			const pad = max === 100 ? 4 : 3;
			embed.addField('Recent Attacks', [
				...data.recent.map(({ attacker, defender }) => {
					const name = Util.escapeMarkdown(attacker.name);
					const stars = this.getStars(attacker.oldStars, attacker.stars);
					const destruction = Math.floor(attacker.destructionPercentage).toString().concat('%');
					return `${stars} \`\u200e${destruction.padStart(pad, ' ')}\` ${BLUE_NUMBERS[attacker.mapPosition]}${ORANGE_NUMBERS[attacker.townHallLevel]}${EMOJIS.VS}${BLUE_NUMBERS[defender.mapPosition]}${ORANGE_NUMBERS[defender.townHallLevel]} ${name}`;
				})
			].join('\n'));
		}

		if (data.remaining.length) {
			const oneRem = data.remaining
				.sort((a, b) => a.mapPosition - b.mapPosition)
				.map(m => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`);

			if (oneRem.length) {
				const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
				chunks.map((chunk, i) => embed.addField(i === 0 ? 'Missed Attacks' : '\u200e', chunk));
			}
		}

		embed.setFooter(`Round #${data.round}`).setTimestamp();
		return embed;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private getLeaderBoard(clan: WarClan, opponent: WarClan) {
		return [
			`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
			`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.SWORD} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.FIRE} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
		].join('\n');
	}

	private getStars(oldStars: number, newStars: number) {
		if (oldStars > newStars) {
			return [
				WAR_STARS.OLD.repeat(newStars),
				WAR_STARS.EMPTY.repeat(3 - newStars)
			].filter(stars => stars.length).join('');
		}
		return [
			WAR_STARS.OLD.repeat(oldStars),
			WAR_STARS.NEW.repeat(newStars - oldStars),
			WAR_STARS.EMPTY.repeat(3 - newStars)
		].filter(stars => stars.length).join('');
	}

	private getRoster(townHalls: Roster[]) {
		return this.chunk(townHalls)
			.map(chunks => {
				const list = chunks.map(th => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}`);
				return list.join(' ');
			}).join('\n');
	}

	private chunk(items: Roster[] = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	private async updateMessageID(id: string, data: WarRes, messageID: string) {
		if (data.groupWar) {
			const cache = this.cached.get(id);
			cache.rounds[data.round] = { warTag: data.warTag, messageID, round: data.round };
			this.cached.set(id, cache);

			return this.client.db.collection(Collections.CLAN_WAR_LOGS)
				.updateOne(
					{ clan_id: new ObjectId(id) },
					{
						$set: {
							updatedAt: new Date(),
							[`rounds.${data.round}`]: { warTag: data.warTag, messageID, round: data.round }
						}
					}
				);
		}

		const cache = this.cached.get(id);
		cache.warID = data.warID;
		cache.messageID = messageID;
		this.cached.set(id, cache);

		return this.client.db.collection(Collections.CLAN_WAR_LOGS)
			.updateOne(
				{ clan_id: new ObjectId(id) },
				{
					$set: { messageID, warID: data.warID, updatedAt: new Date() }
				}
			);
	}

	public async init() {
		await this.client.db.collection(Collections.CLAN_WAR_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map(guild => guild.id) } })
			.forEach(data => {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					guild: data.guild,
					channel: data.channel,
					tag: data.tag,
					rounds: data.rounds || {},
					messageID: data.messageID,
					warID: data.warID
				});
			});
	}

	public async add(id: string) {
		const data = await this.client.db.collection(Collections.CLAN_WAR_LOGS)
			.findOne({ clan_id: new ObjectId(id) });

		if (!data) return null;
		this.cached.set(id, {
			guild: data.guild,
			channel: data.channel,
			tag: data.tag,
			rounds: data.rounds || {},
			messageID: data.messageID,
			warID: data.warID
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
