const { mongodb } = require('../struct/Database');
const { MessageEmbed, Message } = require('discord.js');
const { townHallEmoji, emoji, whiteNum, blueNum } = require('../util/emojis');
const fetch = require('node-fetch');
const { ObjectId } = require('mongodb');
const moment = require('moment');

class ClanWarEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	exec(id, clan) {
		const cache = this.cached.get(id);
		if (cache && cache.updatedAt) {
			if (new Date() - new Date(cache.updatedAt) >= this.timer(cache)) {
				cache.updatedAt = new Date();
				this.cached.set(id, cache);
				return this.permissionsFor(id, cache, clan);
			}

			return;
		}

		if (cache) {
			cache.updatedAt = new Date();
			this.cached.set(id, cache);
			return this.permissionsFor(id, cache, clan);
		}
	}

	timer(cache) {
		const patron = this.client.patron.get(cache.guild, 'guild', false);
		return patron === true ? 10 * 60 * 1000 : 30 * 60 * 1000;
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
		const message = await this.message(id, channel, clan);
		if (!message) return;
		return channel.send(message);
	}

	async message(id, channel, clan, content = '') {
		const data = await this.clanWar(clan.tag);
		if (!data) return null;
		if (data.state === 'notInWar') return null;

		const db = await mongodb.db('clashperk')
			.collection('clanwars')
			.findOne({ tag: clan.tag });

		const states = ['warEnded', 'preparation'];
		if (db && db.opponent === data.opponent.tag && db.posted && db.state === data.state && states.includes(data.state)) return null;

		const embed = new MessageEmbed()
			.setTitle(`${clan.name} (${clan.tag})`)
			.setURL(this.clanURL(data.clan.tag))
			.setThumbnail(clan.badgeUrls.small);
		if (data.state === 'preparation') {
			content = `**War has been declared against ${data.opponent.name}**`;
			embed.setColor(0xfdaf18)
				.setDescription([
					'**War Against**',
					`[${data.opponent.name} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})`,
					'',
					'**War State**',
					'Preparation Day',
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`,
					'',
					'**Start Time**',
					`${moment.duration(new Date(moment(data.startTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })}`
				]);
		}

		if (data.state === 'inWar') {
			content = `**Battle day started against ${data.opponent.name}**`;
			embed.setColor(0xFF0000)
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
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`,
					'',
					'**End Time**',
					moment.duration(new Date(moment(data.endTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })
				]);
		}

		if (data.state === 'warEnded') {
			content = this.roster(data.clan, data.opponent) ? '**Congrats, you won the war...**' : '**Sorry, you lost the war...**';
			embed.setColor(0x10ffc1)
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
					`${emoji.fire} ${data.clan.destructionPercentage}% / ${data.opponent.destructionPercentage}%`,
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`,
					'',
					'**Ended**',
					moment.duration(Date.now() - new Date(moment(data.endTime).toDate()).getTime()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })
				]);
		}

		embed.setDescription([
			embed.description,
			'',
			'**Rosters**',
			`[${data.clan.name}](${this.clanURL(data.clan.tag)})`,
			`${this.roster(data.clan.members)}`,
			'',
			`[${data.opponent.name}](${this.clanURL(data.opponent.tag)})`,
			`${this.roster(data.opponent.members)}`
		]);

		const time = new Date(moment(data.endTime).toDate()).getTime() - Date.now();
		const ending = data.state === 'inWar' && time <= 3 * 60 * 60 * 1000;

		if (db && !db.ending && ending && db.opponent === data.opponent.tag && db.state === data.state && data.state === 'inWar') {
			const embed = this.attacks(data, clan);
			await channel.send({ embed });
		}

		if (db && db.opponent === data.opponent.tag && db.posted && db.state === data.state && data.state === 'inWar') return null;

		await mongodb.db('clashperk')
			.collection('clanwars')
			.findOneAndUpdate({ clan_id: ObjectId(id) }, {
				$set: {
					clan_id: ObjectId(id),
					tag: clan.tag,
					opponent: data.opponent.tag,
					posted: true,
					state: data.state,
					ending: ending && data.state === 'inWar' ? true : false,
					ended: data.state === 'warEnded' ? true : false
				}
			}, { upsert: true });

		return { content: ending ? '' : content, embed };
	}

	attacks(data, clan) {
		const [OneRem, TwoRem] = [
			data.clan.members.filter(m => m.attacks && m.attacks.length === 1),
			data.clan.members.filter(m => m.attacks && m.attacks.length === 0)
		];

		const embed = new MessageEmbed()
			.setTitle(`${clan.name} (${clan.tag})`)
			.setThumbnail(clan.badgeUrls.small)
			.setURL(this.clanURL(clan.tag));

		if (TwoRem.length) {
			embed.addField([
				`**2 ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
				...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `${blueNum[m.mapPosition]} ${m.name}`),
				''
			]);
		}

		if (OneRem.length) {
			embed.setDescription([
				`**1 ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
				...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `${blueNum[m.mapPosition]} ${m.name}`)
			]);
		}

		return embed;
	}

	clanURL(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	result(clan, opponent) {
		const stars = clan.stars !== opponent.stars && clan.stars > opponent.stars;
		const destr = clan.stars === opponent.stars && clan.destructionPercentage > opponent.destructionPercentage;
		if (stars || destr) return true;
		return false;
	}

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
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}/currentwar`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.PLAYER_EVENTS_API}` }
		}).catch(() => null);
		if (!res) return null;
		if (!res.ok) return null;
		return res.json().catch(() => null);
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('playerlogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild) && data.war_updates) {
				this.cached.set(ObjectId(data.clan_id).toString(), {
					guild: data.guild,
					channel: data.channel
				});
			}
		});
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('playerlogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanWarEvent;
