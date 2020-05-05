const { MessageEmbed } = require('discord.js');
const { mongodb } = require('../struct/Database');
const fetch = require('node-fetch');
const { ObjectId } = require('mongodb');
const API_TOKENS = process.env.CLAN_GAMES_API_TOKENS.split(',');

class ClanGames {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async exec(id, clan) {
		// if (!this.event()) return;
		const cache = this.cached.get(id);
		console.log(cache);
		if (cache && cache.updatedAt) {
			if (new Date() - new Date(cache.updatedAt) >= 1 * 60 * 1000) {
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

		if (!cache.message) {
			const msg = await this.sendNew(id, channel, clan);
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
		const embed = await this.embed(clan);
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
		const embed = await this.embed(clan);
		const msg = await message.edit({ embed })
			.catch(error => {
				if (error.code === 10008) {
					return this.sendNew(id, message.channel, clan);
				}
				return null;
			});

		return msg;
	}

	async embed(clan) {
		const db = mongodb.db('clashperk').collection('clangames');
		const data = await db.findOne({ tag: clan.tag });
		const collection = await this.getList(clan.memberList.map(m => m.tag));
		const members = this.filter(collection, data);
		const total = members.reduce((a, b) => a + b.points || 0, 0);
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${clan.members}/50]`,
				`\`\`\`\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.map((m, i) => `${(++i).toString().padStart(2, '\u2002')} ${this.padStart(m.points || '0')} \u2002 ${this.padEnd(m.name)}`).join('\n'),
				'```'
			])
			.setFooter(`Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]`)
			.setTimestamp();

		return embed;
	}

	async getList(tags) {
		let index = 0;
		const collection = [];
		for (const tag of tags) {
			if (index === 4) index = 0;
			const player = await this.player(tag, index);
			const value = player.achievements
				.find(achievement => achievement.name === 'Games Champion')
				.value;
			collection.push({
				name: player.name,
				tag: player.tag,
				points: value
			});
		}

		return collection;
	}

	padStart(num) {
		return num.toString().padStart(6, ' ');
	}

	padEnd(data) {
		return data.padEnd(20, ' ');
	}

	filter(memberList, data) {
		if (!data) {
			return memberList.map(member => ({ tag: member.tag, name: member.name, points: null }));
		}

		if (data && !data.members) {
			return memberList.map(member => ({ tag: member.tag, name: member.name, points: null }));
		}

		const members = memberList.map(member => {
			const points = member.tag in data.members
				? (member.points - data.members[member.tag].points) > 4000
					? 4000
					: member.points - data.members[member.tag].points
				: null;
			return { tag: member.tag, name: member.name, points };
		});

		const sorted = members.sort((a, b) => b.points - a.points);

		return sorted.filter(item => item.points).concat(sorted.filter(item => !item.points));
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
		}, 0.1 * 60 * 1000);
	}

	event(x) {
		if (!x) return true;
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
		if (!this.event()) return this.flush();
		const collection = mongodb.db('clashperk').collection('clangames');
		const data = await collection.findOne({ tag: clan.tag });
		const $set = {};
		let index = 0;
		if (data) {
			for (const tag of clan.memberList.map(m => m.tag)) {
				if (index === 4) index = 0;
				if (tag in data.members === false) {
					const member = await this.player(tag, index);
					if (member) {
						$set.name = clan.name;
						$set.tag = clan.tag;
						$set[`members.${member.tag}`] = {
							tag: member.tag,
							points: member.achievements
								.find(achievement => achievement.name === 'Games Champion')
								.value
						};

						index += 1;
					}
				}
			}
		} else if (!data) {
			for (const tag of clan.memberList.map(m => m.tag)) {
				if (index === 4) index = 0;
				const member = await this.player(tag, index);
				if (member) {
					$set.name = clan.name;
					$set.tag = clan.tag;
					$set[`members.${member.tag}`] = {
						tag: member.tag,
						points: member.achievements
							.find(achievement => achievement.name === 'Games Champion')
							.value
					};

					index += 1;
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

	async player(tag, index) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${API_TOKENS[index]}`
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) {
			console.log(await res.json());
			return null;
		}

		return res.json().catch(() => null);
	}

	async add(id) {
		if (!this.event()) return;
		const data = await mongodb.db('clashperk')
			.collection('clangameslogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel,
			message: data.message,
			color: data.color
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanGames;
