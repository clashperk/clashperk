const { mongodb } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const { townHallEmoji, emoji, leagueEmoji } = require('../util/emojis');
const fetch = require('node-fetch');

const MODE = {
	JOINED: 0x38d863, // green
	LEFT: 0xeb3508 // red
};

class PlayerEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	exec(_id, data) {
		const cache = this.cached.get(_id);
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
		for (const item of data.tags) {
			const embed = await this.embed(item, data);
			if (!embed) continue;
			await channel.send({ embed });
			await this.delay(250);
		}
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
				`${emoji.xp} ${member.expLevel}`,
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
				authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}`
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;

		return res.json().catch(() => null);
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('donationlogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(data._id, {
					_id: data.id,
					guild: data.guild,
					channel: data.channel
				});
			}
		});
	}

	add(data) {
		return this.cached.set(data._id, {
			_id: data.id,
			guild: data.guild,
			channel: data.channel
		});
	}

	delete(_id) {
		return this.cached.delete(_id);
	}
}

module.exports = PlayerEvent;
