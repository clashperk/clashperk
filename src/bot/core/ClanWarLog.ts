import { MessageEmbed, Util, Collection, TextChannel, PermissionString, Message } from 'discord.js';
import { CurrentWar, ClanWarClan, ClanWarOpponent, ClanWarMember } from 'clashofclans.js';
import { CYAN_NUMBERS, BROWN_NUMBERS } from '../util/NumEmojis';
import { TOWN_HALLS, EMOJIS, WAR_STARS } from '../util/Emojis';
import Client from '../struct/Client';
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

interface WarRes extends CurrentWar {
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
	clan: ClanWarClan & { rosters: { total: number; level: number }[] };
	opponent: ClanWarOpponent & { rosters: { total: number; level: number }[] };
	remaining: ClanWarMember[];
	round: number;
	groupWar: boolean;
	warTag?: string;
	warID: number;
}

export default class ClanWarEvent {
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
		const permissions = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel;
			if (channel.permissionsFor(channel.guild.me!)!.has(permissions as PermissionString[], false)) {
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

	private async handleMessage(id: string, channel: TextChannel, messageID: string | null, data: any) {
		if (!data.groupWar && data.remaining.length && data.state === 'warEnded') {
			const embed = this.getRemaining(data);
			try {
				if (embed) await channel.send({ embed });
			} catch (error) {
				this.client.logger.warn(error, { label: 'WAR_REMAINING_MESSAGE' });
			}
		}

		if (!messageID) {
			return this.sendNew(id, channel, data);
		}

		const message = await channel.messages.fetch(messageID, false)
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
		const message = await channel.send({ embed }).catch(() => null);
		if (message) await this.updateMessageID(id, data, message.id);
		return message;
	}

	private edit(id: string, message: Message, data: any) {
		const embed = this.embed(data);

		return message.edit({ embed })
			.catch(error => {
				if (error.code === 10008) {
					return this.sendNew(id, message.channel as TextChannel, data);
				}
				return null;
			});
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
			embed.setColor(states[data.state])
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'Preparation Day',
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`
				]);
			embed.setTimestamp(new Date(moment(data.startTime).toDate()))
				.setFooter('Starting');
		}

		if (data.state === 'inWar') {
			embed.setColor(states[data.state])
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'Battle Day',
					`Ends in ${moment.duration(new Date(moment(data.endTime).toDate()).getTime() - Date.now()).format('D[d], H[h] m[m]', { trim: 'both mid' })}`,
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`,
					'',
					'**War Stats**',
					`${this.getLeaderBoard(data.clan, data.opponent)}`
				]);

			if (data.recent?.length) {
				const max = Math.max(...data.recent.map(atk => atk.attacker.destructionPercentage));
				const pad = max === 100 ? 4 : 3;
				embed.addField('Recent Attacks', [
					...data.recent.map(({ attacker, defender }) => {
						const name = Util.escapeMarkdown(attacker.name);
						const stars = this.getStars(attacker.oldStars, attacker.stars);
						const destruction = Math.floor(attacker.destructionPercentage).toString().concat('%');
						return `${stars} \`\u200e${destruction.padStart(pad, ' ')}\` ${CYAN_NUMBERS[attacker.mapPosition]} ${name} ${BROWN_NUMBERS[attacker.townHallLevel]} ${EMOJIS.RED_VS} ${CYAN_NUMBERS[defender.mapPosition]} ${BROWN_NUMBERS[defender.townHallLevel]}`;
					})
				]);
			}
			embed.setFooter('Synced').setTimestamp();
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
				]);
			embed.setFooter('Ended').setTimestamp(new Date(moment(data.endTime).toDate()));
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
		]);

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
			]);
		const twoRem = data.remaining.filter(m => !m.attacks)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map(m => `\u200e${CYAN_NUMBERS[m.mapPosition]} ${m.name}`);
		const oneRem = data.remaining.filter(m => m.attacks?.length === 1)
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.map(m => `\u200e${CYAN_NUMBERS[m.mapPosition]} ${m.name}`);

		if (twoRem.length) {
			const chunks = Util.splitMessage(twoRem.join('\n'), { maxLength: 1000 });
			chunks.map((chunk, i) => embed.addField(i === 0 ? '2 Remaining Attacks' : '\u200e', chunk));
		}
		if (oneRem.length) {
			const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
			chunks.map((chunk, i) => embed.addField(i === 0 ? '1 Remaining Attacks' : '\u200e', chunk));
		}

		if (oneRem.length || twoRem.length) return embed;
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
			const ends = new Date(moment(data.endTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addField('State', ['Battle Day', `Ends in ${moment.duration(ends - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`])
				.addField('War Stats', this.getLeaderBoard(clan, opponent));
		}

		if (data.state === 'preparation') {
			const start = new Date(moment(data.startTime).toDate()).getTime();
			embed.setColor(states[data.state]);
			embed.addField('State', ['Preparation', `Ends in ${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`]);
		}

		if (data.state === 'warEnded') {
			embed.setColor(results[data.result]);
			embed.addField('State', 'War Ended')
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
			embed.addField('Rosters', rosters.slice(0, 2));
			embed.addField('\u200e', rosters.slice(-2));
		} else {
			embed.addField('Rosters', rosters);
		}

		if (data.recent?.length) {
			const max = Math.max(...data.recent.map(atk => atk.attacker.destructionPercentage));
			const pad = max === 100 ? 4 : 3;
			embed.addField('Recent Attacks', [
				...data.recent.map(({ attacker, defender }) => {
					const name = Util.escapeMarkdown(attacker.name);
					const stars = this.getStars(attacker.oldStars, attacker.stars);
					const destruction = Math.floor(attacker.destructionPercentage).toString().concat('%');
					return `${stars} \`\u200e${destruction.padStart(pad, ' ')}\` ${CYAN_NUMBERS[attacker.mapPosition]} ${name} ${BROWN_NUMBERS[attacker.townHallLevel]} ${EMOJIS.RED_VS} ${CYAN_NUMBERS[defender.mapPosition]} ${BROWN_NUMBERS[defender.townHallLevel]}`;
				})
			]);
		}

		if (data.remaining.length) {
			const oneRem = data.remaining
				.sort((a, b) => a.mapPosition - b.mapPosition)
				.map(m => `\u200e${CYAN_NUMBERS[m.mapPosition]} ${m.name}`);

			if (oneRem.length) {
				const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
				chunks.map((chunk, i) => embed.addField(i === 0 ? 'Remaining Attacks' : '\u200e', chunk));
			}
		}

		embed.setFooter(`Round #${data.round}`).setTimestamp();
		return embed;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private getLeaderBoard(clan: ClanWarClan, opponent: ClanWarOpponent) {
		return [
			`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
			`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.ATTACK_SWORD} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
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

	private getRoster(townHalls: WarRes['clan']['rosters'], codeblock = false) {
		return this.chunk(townHalls)
			.map(chunks => {
				const list = chunks.map(th => {
					const total = `\`\u200e${th.total.toString().padStart(2, ' ')}\``;
					return `${TOWN_HALLS[th.level]} ${codeblock ? total : BROWN_NUMBERS[th.total]}`;
				});
				return list.join(' ');
			}).join('\n');
	}

	private chunk(items: WarRes['clan']['rosters'] = []) {
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

			return this.client.db.collection('clanwarlogs')
				.updateOne(
					{ clan_id: new ObjectId(id) },
					{
						$set: {
							[`rounds.${data.round}`]: { warTag: data.warTag, messageID, round: data.round }
						}
					}
				);
		}

		const cache = this.cached.get(id);
		cache.warID = data.warID;
		cache.messageID = messageID;
		this.cached.set(id, cache);

		return this.client.db.collection('clanwarlogs')
			.updateOne(
				{ clan_id: new ObjectId(id) },
				{
					$set: { messageID, warID: data.warID }
				}
			);
	}

	public async init() {
		await this.client.db.collection('clanwarlogs')
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
		const data = await this.client.db.collection('clanwarlogs')
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
