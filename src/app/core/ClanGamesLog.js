const { MessageEmbed, Message } = require('discord.js');
const { mongodb } = require('../struct/Database');
const { ObjectId } = require('mongodb');
const { Collection } = require('discord.js');

class ClanGames {
	constructor(client) {
		this.client = client;
		this.cached = new Collection();
		this.maxPoint = 5000;
		this.maxTotal = 75000;
		this.gameDay = 22;
	}

	async exec(tag, clan, updated) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(id, cache, clan, updated);
		}

		return clans.clear();
	}

	async permissionsFor(id, cache, clan, updated) {
		const permissions = [
			'READ_MESSAGE_HISTORY',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				return this.handleMessage(id, channel, clan, updated);
			}
		}
	}

	async handleMessage(id, channel, clan, updated) {
		const cache = this.cached.get(id);

		if (cache && !cache.message) {
			return this.sendNew(id, channel, clan, updated);
		}

		if (cache && cache.msg) {
			return this.edit(id, cache.msg, clan, updated);
		}

		const message = await channel.messages.fetch(cache.message, false)
			.catch(error => {
				this.client.logger.warn(error, { label: 'CLAN_GAMES_FETCH_MESSAGE' });
				if (error.code === 10008) {
					return { deleted: true };
				}

				return null;
			});

		if (!message) return;

		if (message.deleted) {
			const msg = await this.sendNew(id, channel, clan, updated);
			if (!msg) return;
			cache.msg = message;
			return this.cached.set(id, cache);
		}

		if (!message.deleted) {
			const msg = await this.edit(id, message, clan, updated);
			if (!msg) return;
			cache.msg = message;
			return this.cached.set(id, cache);
		}
	}

	async sendNew(id, channel, clan, updated) {
		const embed = await this.embed(clan, id, updated);
		const message = await channel.send({ embed })
			.catch(() => null);

		if (message) {
			try {
				const cache = this.cached.get(id);
				cache.message = message.id;
				this.cached.set(id, cache);
				const collection = mongodb.db('clashperk').collection('clangameslogs');
				await collection.updateOne({ clan_id: ObjectId(id) }, { $set: { message: message.id } });
			} catch (error) {
				this.client.logger.warn(error, { label: 'MONGODB_ERROR' });
			}
		}

		return message;
	}

	async edit(id, message, clan, updated) {
		const embed = await this.embed(clan, id, updated);
		if (message instanceof Message === false) {
			const cache = this.cached.get(id);
			cache.msg = null;
			return this.cached.set(id, cache);
		}

		const msg = await message.edit({ embed })
			.catch(error => {
				if (error.code === 10008) {
					const cache = this.cached.get(id);
					cache.msg = null;
					this.cached.set(id, cache);
					return this.sendNew(id, message.channel, clan, updated);
				}
				return null;
			});

		return msg;
	}

	async embed(clan, id, updated) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${clan.members}/50]`,
				`\`\`\`\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				updated.members.slice(0, 55)
					.map((m, i) => {
						const points = this.padStart(m.points || '0');
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
					}).join('\n'),
				'```'
			])
			.setFooter(`Points: ${updated.total} [Avg: ${(updated.total / clan.members).toFixed(2)}]`)
			.setTimestamp();

		return embed;
	}

	event() {
		const now = new Date();
		const START = [
			`${now.getFullYear()}`,
			`${now.getMonth() + 1}`.padStart(2, '0'),
			`${this.gameDay}`
		].join('-');

		const END = [
			`${now.getFullYear()}`,
			`${now.getMonth() + 1}`.padStart(2, '0'),
			`${this.gameDay + 6}T10:00:00Z`
		].join('-');

		return new Date() >= new Date(START) && new Date() <= new Date(END);
	}

	padStart(num) {
		return num.toString().padStart(6, ' ');
	}

	padEnd(data) {
		return data.padEnd(15, ' ');
	}

	async init() {
		if (this.event()) {
			await this._flush();
			return this._init();
		}

		clearInterval(this.intervalId);
		this.intervalId = setInterval(async () => {
			if (this.event()) {
				await this._init();
				await this._flush();
				return clearInterval(this.intervalId);
			}
		}, 5 * 60 * 1000);

		return Promise.resolve(0);
	}

	async _init() {
		const collection = await mongodb.db('clashperk')
			.collection('clangameslogs')
			.find()
			.toArray();

		const filtered = collection.filter(data => this.client.guilds.cache.get(data.guild));
		filtered.forEach(data => {
			this.cached.set(ObjectId(data.clan_id).toString(), {
				guild: data.guild,
				channel: data.channel,
				message: data.message,
				color: data.color,
				tag: data.tag
			});
		});

		return this.client.grpc.initClanGamesHandler({
			data: JSON.stringify(filtered)
		}, () => { });
	}

	async flush(intervalId) {
		if (this.event()) return null;
		await this.init();
		clearInterval(intervalId);
		return this.cached.clear();
	}

	async _flush() {
		const intervalId = setInterval(() => this.flush(intervalId), 5 * 60 * 1000);
		return Promise.resolve(0);
	}

	async add(id) {
		if (!this.event()) return null;
		const data = await mongodb.db('clashperk')
			.collection('clangameslogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel,
			message: data.message,
			color: data.color,
			tag: data.tag
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanGames;
