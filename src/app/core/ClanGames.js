const { MessageEmbed } = require('discord.js');
const { mongodb } = require('../struct/Database');
const fetch = require('node-fetch');
const { ObjectId } = require('mongodb');

class ClanGames {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async exec(id, clan) {
		if (!this.event()) return;
		const cache = this.cached.get(id);
		if (cache && cache.updatedAt) {
			if (new Date() - new Date(cache.updatedAt) > 30 * 60 * 1000) {
				cache.updatedAt = new Date();
				this.cached.set(id, cache);
				await this.update(clan);
				return this.permissionsFor(id, cache, clan);
			}

			return;
		}

		if (cache) {
			cache.updatedAt = new Date();
			this.cached.set(id, cache);
			await this.update(clan);
			return this.permissionsFor(id, cache, clan);
		}
	}

	permissionsFor(id, cache, clan) {
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
				return this.handleMessage(id, channel, clan);
			}
		}
	}

	async handleMessage(id, channel, clan) {
		const cache = this.cached.get(id);
		if (cache && cache.msg && cache.msg.deleted) {
			const msg = await this.sendNew(id, channel, clan);
			if (!msg) return;
			cache.msg = msg;
			return this.cached.set(id, cache);
		}

		if (cache && cache.msg && !cache.msg.deleted) {
			const msg = await this.edit(id, cache.msg, clan);
			if (!msg) return;
			cache.msg = msg;
			return this.cached.set(id, cache);
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
			const msg = await this.sendNew(id, channel, clan);
			if (!msg) return;
			cache.msg = msg;
			return this.cached.set(id, cache);
		}

		if (!message.deleted) {
			const msg = await this.edit(id, message, clan);
			if (!msg) return;
			cache.msg = msg;
			return this.cached.set(id, cache);
		}
	}

	async sendNew(id, channel, clan) {
		const embed = await this.embed(id, clan);
		const message = await channel.send({ embed })
			.catch(() => null);

		if (message) {
			try {
				const collection = mongodb.db('clashperk').collection('clangameslogs');
				await collection.updateOne({ clan_id: ObjectId(id) }, { $set: { message: message.id } });
			} catch (error) {
				this.client.logger.warn(error, { label: 'MONGODB_ERROR' });
			}
		}

		return message;
	}

	async edit(id, message, clan) {
		const embed = await this.embed(id, clan);
		const msg = await message.edit({ embed })
			.catch(error => {
				if (error.code === 10008) {
					return this.sendNew(id, message.channel, clan);
				}
				return null;
			});

		return msg;
	}

	async embed(id, clan) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed();
		if (cache) {
			embed.setColor(cache.color)
				.setAuthor(clan.name)
				.setTimestamp();
			// TODO: More

			return embed;
		}

		embed.setColor(0x5970c1)
			.setTimestamp()
			.setAuthor(clan.name);
		// TODO: More

		return embed;
	}

	async init() {
		const intervalId = setInterval(async () => {
			if (this.event()) {
				const collection = await mongodb.db('clashperk')
					.collection('clangameslogs')
					.find()
					.toArray();

				collection.forEach(data => {
					if (this.client.guilds.cache.has(data.guild)) {
						this.cached.set(ObjectId(data.clan_id).toString(), {
							guild: data.guild,
							channel: data.channel,
							message: data.message,
							color: data.color
						});
					}
				});

				return clearInterval(intervalId);
			}
		}, 2 * 60 * 1000);
	}

	event() {
		const START = [
			new Date()
				.getFullYear(),
			(new Date()
				.getMonth() + 1)
				.toString()
				.padStart(2, '0'),
			22
		].join('-');

		const END = [
			new Date()
				.getFullYear(),
			(new Date()
				.getMonth() + 1)
				.toString()
				.padStart(2, '0'),
			28
		].join('-');

		return new Date() >= new Date(START) && new Date() <= new Date(END);
	}

	flush() {
		if (this.event()) {
			for (const cache of this.cached.values()) {
				if (cache && cache.intervalID) clearInterval(cache.intervalID);
			}

			return this.cached.clear();
		}
	}

	async update(clan) {
		const collection = mongodb.db('clashperk').collection('clangames');
		const data = await collection.findOne({ tag: clan.tag });
		const $set = {};
		if (data) {
			for (const tag of clan.memberList.map(m => m.tag)) {
				if (tag in data.memberList === false) {
					const member = await this.player(tag);
					if (member) {
						$set.name = clan.name;
						$set.tag = clan.tag;
						$set[`members.${member.tag}`] = {
							tag: member.tag,
							points: member.achievements
								.find(achievement => achievement.name === 'Games Champion')
								.value
						};

						await this.delay(100);
					}
				}
			}
		} else if (!data) {
			for (const tag of clan.memberList.map(m => m.tag)) {
				const member = await this.player(tag);
				if (member) {
					$set.name = clan.name;
					$set.tag = clan.tag;
					$set[`members.${member.tag}`] = {
						tag: member.tag,
						points: member.achievements
							.find(achievement => achievement.name === 'Games Champion')
							.value
					};

					await this.delay(100);
				}
			}
		}

		if (Object.keys($set).length) {
			return collection.updateOne({ tag: clan.tag }, { $set }, { upsert: true })
				.catch(error => this.client.logger.warn(error, { label: 'MONGODB_ERROR' }));
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async player(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.CLAN_GAMES_API}`
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;

		return res.json().catch(() => null);
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('clangameslogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel,
			message: data.message,
			color: data.color,
			embed: data.embed
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanGames;
