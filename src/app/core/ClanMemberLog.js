const { townHallEmoji, emoji, leagueEmoji, heroEmoji } = require('../util/emojis');
const { mongodb } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const moment = require('moment');
const { Collection } = require('discord.js');

const MODE = {
	JOINED: 0x38d863, // green
	LEFT: 0xeb3508 // red
};

class PlayerEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Collection();
	}

	async exec(tag, data) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(cache, data, id);
		}

		return clans.clear();
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async permissionsFor(cache, data, id) {
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
				return this.handleMessage(channel, data, id);
			}
		}
	}

	async handleMessage(channel, data, id) {
		const ms = data.tags.length >= 5 ? 2000 : 250;
		for (const item of data.tags.sort((a, b) => a.value - b.value)) {
			const message = await this.embed(channel, item, data, id);
			if (!message) continue;
			await channel.send(message).catch(() => null);
			await this.delay(ms);
		}

		return data.tags.length;
	}

	async embed(channel, item, data, id) {
		const cache = this.cached.get(id);
		if (!cache) return null;
		const member = await this.player(item.tag);
		if (!member) return null;

		let content = '';
		const embed = new MessageEmbed()
			.setColor(MODE[item.mode])
			.setTitle(`\u200e${member.name} (${member.tag})`)
			.setURL(`https://www.clashofstats.com/players/${item.tag.substr(1)}`);
		if (item.mode === 'LEFT') {
			embed.setFooter(`Left ${data.clan.name}`, data.clan.badge);
			embed.setDescription([
				`${townHallEmoji[member.townHallLevel]} **${member.townHallLevel}**`,
				`${emoji.xp} **${member.expLevel}**`,
				`${emoji.troopsdonation} **${item.donated}**${emoji.donated} **${item.received}**${emoji.received}`
			].join(' '));
		} else {
			const flag = await mongodb.db('clashperk')
				.collection('flaggedusers')
				.findOne({ guild: cache.guild, tag: item.tag });

			embed.setFooter(`Joined ${data.clan.name}`, data.clan.badge);
			embed.setDescription([
				`${townHallEmoji[member.townHallLevel]}**${member.townHallLevel}**`,
				`${this.formatHeroes(member)}`,
				`${emoji.warstar}**${member.warStars}**`,
				`${leagueEmoji[member.league ? member.league.id : 29000000]}**${member.trophies}**`
			].join(' '));

			if (flag) {
				const user = await this.client.users.fetch(flag.user, false).catch(() => null);
				if (channel.guild.roles.cache.has(cache.role)) {
					const role = channel.guild.roles.cache.get(cache.role);
					content = `${role}`;
				}
				embed.setDescription([
					embed.description,
					'',
					'**Flag**',
					`${flag.reason}`,
					`\`${user ? user.tag : 'Unknown#0000'} (${moment.utc(flag.createdAt).format('DD-MM-YYYY kk:mm')})\``
				]);
			}
		}
		embed.setTimestamp();
		return { content, embed };
	}

	formatHeroes(member) {
		if (member.heroes) {
			const heroes = member.heroes.filter(({ village }) => village === 'home');
			return heroes.length
				? heroes.length > 3
					? heroes.map(hero => `${heroEmoji[hero.name]}**${hero.level}**`).join(' ')
					: `${emoji.xp}**${member.expLevel}** ${heroes.map(hero => `${heroEmoji[hero.name]}**${hero.level}**`).join(' ')}`
				: `${emoji.xp} **${member.expLevel}**`;
		}

		return `${emoji.xp} **${member.expLevel}**`;
	}

	async player(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.DEVELOPER_TOKEN}`
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
					role: data.role,
					tag: data.tag
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
			role: data.role,
			tag: data.tag
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = PlayerEvent;
