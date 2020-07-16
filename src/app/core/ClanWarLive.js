const { townHallEmoji, emoji, whiteNum, blueNum } = require('../util/emojis');
const { mongodb } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const moment = require('moment');

const color = {
	red: 15158332,
	green: 3066993,
	inWar: 16345172,
	prep: 16745216
};

class ClanWarEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	exec(id, clan) {
		const cache = this.cached.get(id);
		if (cache && cache.updated) {
			if (new Date() >= new Date(cache.updated)) {
				this.setCache(Date.now(), id);
				return this.permissionsFor(id, cache, clan);
			}

			return null;
		}

		if (cache) {
			this.setCache(Date.now(), id);
			return this.permissionsFor(id, cache, clan);
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	permissionsFor(id, cache, clan) {
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
				return this.handleMessage(id, channel, clan);
			}
		}
	}

	async handleMessage(id, channel, clan) {
		return this.fetchClanWar(id, channel, clan);
	}

	// For Normal Clan Wars
	async fetchClanWar(id, channel, clan) {
		const data = await this.clanWar(clan.tag, id);
		if (!data) return null;
		if (data.state === 'notInWar') return null;

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

		if (db && db.opponent === data.opponent.tag && db.posted && db.state === data.state && data.state === 'preparation') return null;

		const embed = new MessageEmbed()
			.setTitle(`${clan.name} (${clan.tag})`)
			.setURL(this.clanURL(data.clan.tag))
			.setThumbnail(clan.badgeUrls.small);
		if (data.state === 'preparation') {
			embed.setColor(null)
				.setDescription([
					'**War Against**',
					`[${data.opponent.name} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})`,
					'',
					'**War State**',
					'Preparation Day',
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`
				]);
			embed.setTimestamp()
				.setFooter(`Starts in ${moment.duration(new Date(moment(data.startTime).toDate()).getTime() - Date.now()).format('D[d], H[h] m[m]', { trim: 'both mid' })}`);
		}

		if (data.state === 'inWar') {
			embed.setColor(color.inWar)
				.setDescription([
					'**War Against**',
					`[${data.opponent.name} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})`,
					'',
					'**War State**',
					'Battle Day',
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`,
					'',
					'**War Stats**',
					`${emoji.star} ${data.clan.stars} / ${data.opponent.stars}`,
					`${emoji.fire} ${data.clan.destructionPercentage}% / ${data.opponent.destructionPercentage}%`,
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`
				]);
			embed.setTimestamp()
				.setFooter(`Ends in ${moment.duration(new Date(moment(data.endTime).toDate()).getTime() - Date.now()).format('D[d], H[h] m[m]', { trim: 'both mid' })}`);
		}

		if (data.state === 'warEnded') {
			embed.setColor(this.result(data.clan, data.opponent) ? color.green : color.red)
				.setDescription([
					'**War Against**',
					`[${data.opponent.name} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})`,
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
			`${data.clan.name}`,
			`${this.roster(data.clan.members)}`,
			'',
			`${data.opponent.name}`,
			`${this.roster(data.opponent.members)}`
		]);

		if (data.state === 'preparation') {
			const message = await channel.send({ embed }).catch(() => null);
			if (!message) return null;
			await mongodb.db('clashperk')
				.collection('clanwars')
				.findOneAndUpdate({ clan_id: ObjectId(id) }, {
					$set: {
						opponent: data.opponent.tag,
						posted: true,
						state: data.state,
						message: message.id,
						updatedAt: new Date()
					}
				}, { upsert: true });

			return message;
		}

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
						tag: clan.tag,
						opponent: data.opponent.tag,
						state: data.state,
						message: message.id,
						updatedAt: new Date()
					}
				}, { upsert: true });

			return message;
		}

		if (data.state === 'warEnded') {
			if (!db) return null;
			if (db && db.ended && db.opponent === data.opponent.tag) return null;
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
						tag: clan.tag,
						opponent: data.opponent.tag,
						ended: true,
						state: data.state,
						updatedAt: new Date()
					}
				});
			return channel.send({ embed: this.missing(data, clan) });
		}
	}

	// Build Remaining/Missed Attack Embed
	missing(data, clan) {
		const [OneRem, TwoRem] = [
			data.clan.members.filter(m => m.attacks && m.attacks.length === 1),
			data.clan.members.filter(m => !m.attacks)
		];

		const embed = new MessageEmbed()
			.setTitle(`${clan.name} (${clan.tag})`)
			.setThumbnail(clan.badgeUrls.small)
			.setURL(this.clanURL(clan.tag));

		if (TwoRem.length) {
			embed.setDescription([
				`**2 ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
				...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${blueNum[m.mapPosition]} ${m.name}`),
				''
			]);
		}

		if (OneRem.length) {
			embed.setDescription([
				embed.description || '',
				`**1 ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
				...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${blueNum[m.mapPosition]} ${m.name}`)
			]);
		}

		return embed;
	}

	clanURL(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	// Decides War Result
	result(clan, opponent) {
		const stars = clan.stars !== opponent.stars && clan.stars > opponent.stars;
		const destr = clan.stars === opponent.stars && clan.destructionPercentage > opponent.destructionPercentage;
		if (stars || destr) return true;
		return false;
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

	async clanWar(tag, id) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}/currentwar`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
		}).catch(() => null);
		if (!res) return null;
		if (!res.ok) return null;
		const sec = Math.floor(res.headers.raw()['cache-control'][0].split('=')[1]);
		this.setCache(Date.now() + (sec * 1000), id);
		return res.json().catch(() => null);
	}

	setCache(ms, id) {
		const cache = this.cached.get(id);
		if (!this.client.patron.get(cache.guild, 'guild', false)) ms += (10 * 60 * 1000) + 1000;
		else ms += 1000;
		cache.updated = new Date(ms);
		this.client.logger.debug(cache.updated, { label: 'TIMESTAMP' });
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
					channel: data.channel
				});
			}
		});
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('clanwarlogs')
			.findOne({ clan_id: ObjectId(id) });
		const db = await mongodb.db('clashperk')
			.collection('clanwars')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel,
			updated: db && db.updatedAt ? new Date(db.updatedAt) : null
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanWarEvent;
