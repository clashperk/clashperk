const { MessageEmbed, Message } = require('discord.js');
const { mongodb } = require('../struct/Database');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const moment = require('moment');

class ClanGames {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async exec(id, clan, forced = false, tags = []) {
		if (!this.event()) return this.flush();

		// force update points
		const cache = this.cached.get(id);
		if (cache && forced) {
			return setTimeout(async () => {
				const db = mongodb.db('clashperk').collection('clangames');
				const data = await db.findOne({ tag: clan.tag });
				return this.getList(clan, data, tags.map(t => t.tag));
			}, 2.1 * 60 * 1000);
		}

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
		return patron === true ? 15 * 60 * 1000 : 30 * 60 * 1000;
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

		if (cache && !cache.message) {
			return this.sendNew(id, channel, clan);
		}

		if (cache && cache.msg) {
			return this.edit(id, cache.msg, clan);
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
			cache.msg = message;
			return this.cached.set(id, cache);
		}

		if (!message.deleted) {
			const msg = await this.edit(id, message, clan);
			if (!msg) return;
			cache.msg = message;
			return this.cached.set(id, cache);
		}
	}

	async sendNew(id, channel, clan) {
		const embed = await this.embed(clan, id);
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

	async edit(id, message, clan) {
		const embed = await this.embed(clan, id);
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
					return this.sendNew(id, message.channel, clan);
				}
				return null;
			});

		return msg;
	}

	async embed(clan, id) {
		const db = mongodb.db('clashperk').collection('clangames');
		const data = await db.findOne({ tag: clan.tag });
		const items = await this.getList(clan, data, clan.memberList.map(m => m.tag));
		const members = this.filter(items.collection, items.data);
		const total = members.reduce((a, b) => a + b.points || 0, 0);

		const day = this.client.settings.get('global', 'clangamesDay', 22);
		const START = [new Date().getFullYear(), (new Date().getMonth() + 1).toString().padStart(2, '0'), `${day + 1}T08:00:00Z`].join('-');
		const createdAt = new Date(ObjectId(items.data._id).getTimestamp());
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${clan.members}/50]${createdAt > new Date(START) ? `\nCreated on ${moment(createdAt).format('D MMMM YYYY, kk:mm')}` : ''}`,
				`\`\`\`\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.map((m, i) => `\u200e${(++i).toString().padStart(2, '\u2002')} ${this.padStart(m.points || '0')} \u2002 ${this.padEnd(m.name)}`).join('\n'),
				'```'
			])
			.setFooter(`Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]`)
			.setTimestamp();

		return embed;
	}

	async update(clan, data, collection) {
		if (!this.event()) return this.flush();
		const $set = {};
		if (data) {
			for (const member of collection) {
				if (member.tag in data.members === false) {
					$set.name = clan.name;
					$set.tag = clan.tag;
					$set[`members.${member.tag}`] = { name: member.name, tag: member.tag, points: member.points };
				}

				if (member.tag in data.members) {
					if (member.points === data.members[member.tag].points) continue;
					$set.name = clan.name;
					$set.tag = clan.tag;
					$set[`members.${member.tag}.gain`] = member.points - data.members[member.tag].points;
				}
			}
		} else if (!data) {
			for (const member of collection) {
				$set.name = clan.name;
				$set.tag = clan.tag;
				$set[`members.${member.tag}`] = { name: member.name, tag: member.tag, points: member.points };
			}
		}

		if (Object.keys($set).length) {
			const data = await mongodb.db('clashperk')
				.collection('clangames')
				.findOneAndUpdate({ tag: clan.tag }, { $set }, { upsert: true, returnOriginal: false });

			return data.value;
		}

		return data;
	}

	async getList(clan, data, tags) {
		const collection = [];
		for (const tag of tags) {
			const player = await this.player(tag);
			if (!player) continue;
			if (!player.achievements) continue;
			const value = player.achievements
				.find(achievement => achievement.name === 'Games Champion')
				.value;
			collection.push({
				name: player.name,
				tag: player.tag,
				points: value
			});
		}

		const updated = await this.update(clan, data, collection);
		return { collection, data: updated };
	}

	padStart(num) {
		return num.toString().padStart(6, ' ');
	}

	padEnd(data) {
		return data.padEnd(15, ' ');
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

		const tags = memberList.map(m => m.tag);
		const excess = Object.values(data.members)
			.filter(x => x.gain && x.gain > 0 && !tags.includes(x.tag))
			.map(x => ({ name: x.name, tag: x.tag, points: x.gain > 4000 ? 4000 : x.gain }));
		const sorted = members.concat(excess).sort((a, b) => b.points - a.points);
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
		}, 1 * 60 * 1000);
	}

	event() {
		const day = this.client.settings.get('global', 'clangamesDay', 22);
		const START = [
			new Date()
				.getFullYear(),
			(new Date()
				.getMonth() + 1)
				.toString()
				.padStart(2, '0'),
			day
		].join('-');

		const END = [
			new Date()
				.getFullYear(),
			(new Date()
				.getMonth() + 1)
				.toString()
				.padStart(2, '0'),
			`${day + 6}T10:00:00Z`
		].join('-');

		return new Date() >= new Date(START) && new Date() <= new Date(END);
	}

	async flush() {
		if (!this.event()) {
			await mongodb.db('clashperk')
				.collection('clangameslogs')
				.updateMany({}, { $unset: { message: '' } });
			return this.cached.clear();
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
				authorization: `Bearer ${process.env.$KEY}`
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;
		return res.json().catch(() => null);
	}

	async add(id) {
		if (!this.event()) return this.flush();
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
