const { townHallEmoji, emoji, whiteNum, blueNum } = require('../util/emojis');
const { mongodb } = require('../struct/Database');
const { MessageEmbed, Util } = require('discord.js');
const { Client } = require('clashofclans.js');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const client = new Client({
	timeout: 3000,
	token: process.env.$KEY
});

const color = {
	red: 15158332,
	green: 3066993,
	war: 16345172,
	prep: 16745216
};

class ClanWarEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	exec(id) {
		const cache = this.cached.get(id);
		if (cache) {
			return this.permissionsFor(id, cache);
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	permissionsFor(id, cache) {
		const permissions = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				return this.handleMessage(id, channel);
			}
			return this.setTimer(id);
		}
	}

	async handleMessage(id, channel) {
		return this.fetchClanWar(id, channel);
	}

	// For Normal Clan Wars
	async fetchClanWar(id, channel) {
		const cache = this.cached.get(id);
		const data = await this.clanWar(cache.tag);
		if (!data) return this.setTimer(id);
		if (data.state === 'notInWar') return this.setTimer(id);

		const db = await mongodb.db('clashperk')
			.collection('clanwars')
			.findOne({ clan_id: ObjectId(id) });

		if (db && db.opponent !== data.opponent.tag && db.state !== data.state) {
			await mongodb.db('clashperk')
				.collection('clanwars')
				.findOneAndUpdate({ clan_id: ObjectId(id) }, {
					$set: {
						clan_id: ObjectId(id),
						ended: false,
						ending: false
					}
				}, { upsert: true });
		}

		if (db && db.opponent === data.opponent.tag && db.posted && db.state === data.state && data.state === 'preparation') {
			const startsIn = new Date(moment(data.startTime).toDate()).getTime() - Date.now();
			if (startsIn <= 36e5) return this.setTimer(id, data.maxAge * 1000, false);
			return this.setTimer(id, 36e5, false);
		}

		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(this.clanURL(data.clan.tag))
			.setThumbnail(data.clan.badgeUrls.small);
		if (data.state === 'preparation') {
			embed.setColor(color.prep)
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
			embed.setColor(color.war)
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
					`${emoji.star} ${data.clan.stars} / ${data.opponent.stars}`,
					`${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% / ${data.opponent.destructionPercentage.toFixed(2)}%`,
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`
				]);
			embed.setTimestamp().setFooter('Last Updated');
		}

		if (data.state === 'warEnded') {
			embed.setColor(this.result(data.clan, data.opponent))
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
					`${emoji.star} ${data.clan.stars} / ${data.opponent.stars}`,
					`${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% / ${data.opponent.destructionPercentage.toFixed(2)}%`,
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`
				]);
			embed.setFooter('Ended').setTimestamp(new Date(moment(data.endTime).toDate()));
		}

		embed.setDescription([
			embed.description,
			'',
			'**Rosters**',
			`${Util.escapeMarkdown(data.clan.name)}`,
			`${this.roster(data.clan.members)}`,
			'',
			`${Util.escapeMarkdown(data.opponent.name)}`,
			`${this.roster(data.opponent.members)}`
		]);

		if (data.state === 'preparation') {
			const message = await channel.send({ embed }).catch(() => null);
			if (message) {
				await mongodb.db('clashperk')
					.collection('clanwars')
					.findOneAndUpdate({ clan_id: ObjectId(id) }, {
						$set: {
							clan_id: ObjectId(id),
							opponent: data.opponent.tag,
							tag: data.clan.tag,
							posted: true,
							state: data.state,
							message: message.id,
							updatedAt: new Date()
						}
					}, { upsert: true });
			}
		}

		const endsIn = new Date(moment(data.endTime).toDate()).getTime() - Date.now();
		if (data.state === 'inWar' && endsIn <= 0) data.state === 'warEnded';

		if (data.state === 'inWar') {
			// if (db && ((new Date() - new Date(db.updatedAt)) < 10 * 60 * 100)) return null;
			let message = null;
			if (db && db.message) {
				message = await channel.messages.fetch(db.message, false).catch(() => null);
				if (message) {
					await message.edit({ embed });
				} else {
					message = await channel.send({ embed });
				}
			} else {
				message = await channel.send({ embed });
			}

			await mongodb.db('clashperk')
				.collection('clanwars')
				.findOneAndUpdate({ clan_id: ObjectId(id) }, {
					$set: {
						clan_id: ObjectId(id),
						tag: data.clan.tag,
						opponent: data.opponent.tag,
						state: data.state,
						message: message.id,
						updatedAt: new Date()
					}
				}, { upsert: true });
		}

		if (data.state === 'warEnded') {
			if (!db) return this.setTimer(id);
			if (db && db.ended && db.opponent === data.opponent.tag) return this.setTimer(id);
			let message = null;
			if (db && db.message) {
				message = await channel.messages.fetch(db.message, false).catch(() => null);
				if (message) {
					await message.edit({ embed });
				} else {
					message = await channel.send({ embed });
				}
			} else {
				message = await channel.send({ embed });
			}
			await mongodb.db('clashperk')
				.collection('clanwars')
				.findOneAndUpdate({ clan_id: ObjectId(id) }, {
					$set: {
						clan_id: ObjectId(id),
						tag: data.clan.tag,
						opponent: data.opponent.tag,
						ended: true,
						state: data.state,
						updatedAt: new Date()
					}
				});
			if (this.missing(data)) await channel.send({ embed: this.missing(data) });
		}

		// overwrite the timer for last 1 hour
		if (data.state === 'inWar') {
			if (endsIn < 36e5 && endsIn > 6e5) this.setTimer(id, data.maxAge * 1000, false);
			else if (endsIn <= 6e5) this.setTimer(id, endsIn + 2000, false);
			else this.setTimer(id, data.maxAge * 1000, true);
		} else {
			this.setTimer(id, data.maxAge * 1000, true);
		}
	}

	// Build Remaining/Missed Attack Embed
	missing(data) {
		const [OneRem, TwoRem] = [
			data.clan.members.filter(m => m.attacks && m.attacks.length === 1),
			data.clan.members.filter(m => !m.attacks)
		];

		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setThumbnail(data.clan.badgeUrls.small)
			.setURL(this.clanURL(data.clan.tag))
			.setDescription([
				'**War Against**',
				`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`
			]);

		if (TwoRem.length) {
			embed.setDescription([
				embed.description,
				'',
				`**2 ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
				...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${blueNum[m.mapPosition]} ${m.name}`),
				''
			]);
		}

		if (OneRem.length) {
			embed.setDescription([
				embed.description,
				`**1 ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
				...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${blueNum[m.mapPosition]} ${m.name}`)
			]);
		}

		if (OneRem.length || TwoRem.length) return embed;
		return null;
	}

	clanURL(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	// Decides War Result
	result(clan, opponent) {
		const tied = clan.stars === opponent.stars && clan.destructionPercentage === opponent.destructionPercentage;
		if (tied) return null;
		const stars = clan.stars !== opponent.stars && clan.stars > opponent.stars;
		const destr = clan.stars === opponent.stars && clan.destructionPercentage > opponent.destructionPercentage;
		if (stars || destr) return color.green;
		return color.red;
	}

	// Builds Clan Roster
	roster(members = []) {
		const reduced = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map(entry => ({ level: entry[0], total: entry[1] }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map(chunks => {
				const list = chunks.map(th => `${townHallEmoji[th.level]} ${whiteNum[th.total]}`);
				return list.join(' ');
			}).join('\n');
	}

	chunk(items = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	async clanWar(tag) {
		const data = await client.fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}/currentwar`, {
			token: process.env.$KEY
		}).catch(() => null);
		if (!data) return null;
		if (!data.ok) return null;
		return data;
	}

	// set timer according to cache-control header
	setTimer(id, ms = 9e5, filter = true) {
		const cache = this.cached.get(id);
		if (cache && cache.intervalId) clearInterval(cache.intervalId);

		if (filter && !this.client.patron.get(cache.guild, 'guild', false)) ms += 6e5;
		if (ms < 2000) ms += 6e5;
		else ms += 2000;

		cache.intervalId = setInterval(this.exec.bind(this), ms, id);
		return this.cached.set(id, cache);
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('clanwarlogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(ObjectId(data.clan_id).toString(), {
					guild: data.guild,
					channel: data.channel,
					tag: data.tag
				});
			}
		});

		for (const id of this.cached.keys()) {
			await this.exec(id);
			await this.delay(100);
		}
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('clanwarlogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel,
			tag: data.tag
		});

		return this.exec(ObjectId(id).toString());
	}

	clear() {
		for (const key of this.cached.keys()) {
			const cache = this.cached.get(key);
			if (cache && cache.intervalId) clearInterval(cache.intervalId);
		}
		return this.cached.clear();
	}

	delete(id) {
		const cache = this.cached.get(id);
		if (cache && cache.intervalId) clearInterval(cache.intervalId);
		return this.cached.delete(id);
	}
}

module.exports = ClanWarEvent;
