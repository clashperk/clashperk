const { mongodb } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const { townHallEmoji, emoji, leagueEmoji, heroEmoji } = require('../util/emojis');
const fetch = require('node-fetch');
const { ObjectId } = require('mongodb');

const MODE = {
	JOINED: 0x38d863, // green
	LEFT: 0xeb3508 // red
};

class PlayerEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	exec(id, data) {
		const cache = this.cached.get(id);
		if (cache) {
			return this.permissionsFor(cache, data);
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	permissionsFor(cache, data) {
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
				return this.handleMessage(channel, data);
			}
		}
	}

	async handleMessage(channel, data) {
		if (data.tags.length >= 5) return this.queue(channel, data);
		for (const item of data.tags) {
			const embed = await this.embed(item, data);
			if (!embed) continue;
			await channel.send({ embed });
			await this.delay(250);
		}

		return data.tags.length;
	}

	async queue(channel, data) {
		for (const item of data.tags) {
			const embed = await this.embed(item, data);
			if (!embed) continue;
			await channel.send({ embed });
			await this.delay(2000);
		}

		return data.tags.length;
	}

	async embed(item, data) {
		const member = await this.player(item.tag);
		if (!member) return null;
		const embed = new MessageEmbed()
			.setColor(MODE[item.mode])
			.setTitle(`${member.name} (${member.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${item.tag}`)
			.setDescription([
				`${townHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
				// `${emoji.xp} ${member.expLevel}`,
				`${member.heroes.filter(({ village }) => village === 'home')
					.map(hero => `${heroEmoji[hero.name]} ${hero.level}`).join(' ')}`,
				`${emoji.warstar} ${member.warStars}`,
				`${leagueEmoji[member.league ? member.league.id : 29000000]} ${member.trophies}`
			].join(' '))
			.setFooter(data.clan.name, data.clan.badge)
			.setTimestamp();

		return embed;
	}

	async player(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.PLAYER_EVENTS_API}`
			},
			timeout: 3000
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

module.exports = PlayerEvent;
