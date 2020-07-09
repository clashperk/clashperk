const { townHallEmoji, emoji, leagueEmoji, heroEmoji } = require('../util/emojis');
const { mongodb } = require('../struct/Database');
const { MessageEmbed, WebhookClient } = require('discord.js');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const moment = require('moment');

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
			return this.permissionsFor(cache, data, id);
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	permissionsFor(cache, data, id) {
		const permissions = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			// 'MANAGE_WEBHOOKS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				return this.handleMessage(channel, data, id);
			}
		}
	}

	async handleMessage(channel, data, id) {
		const ms = data.tags.length >= 5 ? 2000 : 250;
		for (const item of data.tags.sort((a, b) => a.value - b.value)) {
			const embed = await this.embed(item, data, id);
			if (!embed) continue;
			await channel.send({ embed }).catch(() => null);
			await this.delay(ms);
		}

		return data.tags.length;
	}

	async embed(item, data, id) {
		const cache = this.cached.get(id);
		const member = await this.player(item.tag);
		if (!member) return null;

		const embed = new MessageEmbed()
			.setColor(MODE[item.mode])
			.setTitle(`\u200e${member.name} - ${member.tag}`)
			.setURL(`https://www.clashofstats.com/players/${item.tag.substr(1)}`);
		if (item.mode === 'LEFT') {
			embed.setDescription([
				`${townHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
				`${emoji.xp} ${member.expLevel}`,
				`${emoji.troopsdonation} ${item.donated}${emoji.donated} ${item.received}${emoji.received}`
			].join(' '));
		} else {
			const flag = await mongodb.db('clashperk')
				.collection('flaggedusers')
				.findOne({ guild: cache.guild, tag: item.tag });

			embed.setDescription([
				`${townHallEmoji[member.townHallLevel]}${member.townHallLevel}`,
				`${this.formatHeroes(member)}`,
				`${emoji.warstar}${member.warStars}`,
				`${leagueEmoji[member.league ? member.league.id : 29000000]}${member.trophies}`
			].join(' '));

			if (flag) {
				const user = await this.client.users.fetch(flag.user, false).catch(() => null);
				embed.setDescription([
					embed.description,
					'',
					'**Flag**',
					`${flag.reason}`,
					`**${user ? user.tag : 'Unknown#0000'} (${moment.utc(flag.createdAt).format('MMMM D, YYYY, kk:mm')})**`
				]);
			}
		}
		embed.setFooter(`${data.clan.name}`, data.clan.badge).setTimestamp();
		return embed;
	}

	formatHeroes(member) {
		if (member.heroes) {
			const heroes = member.heroes.filter(({ village }) => village === 'home');
			return heroes.length
				? heroes.length > 3
					? heroes.map(hero => `${heroEmoji[hero.name]}${hero.level}`).join(' ')
					: `${emoji.xp}${member.expLevel} ${heroes.map(hero => `${heroEmoji[hero.name]}${hero.level}`).join(' ')}`
				: `${emoji.xp} ${member.expLevel}`;
		}

		return `${emoji.xp} ${member.expLevel}`;
	}

	async player(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.$KEY}`
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
					channel: data.channel,
					webhook: data.webhook
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
			channel: data.channel,
			webhook: data.webhook
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = PlayerEvent;
