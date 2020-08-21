const { MessageEmbed, Message } = require('discord.js');
const { mongodb } = require('../struct/Database');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const { Collection } = require('discord.js');

class ClanGames {
	constructor(client) {
		this.client = client;
		this.cached = new Collection();
	}

	async exec(tag, clan, forced = false, tags = []) {
		if (!this.event()) return null;
		const clans = this.cached.filter(d => d.tag === tag);
		if (forced && clans.size) {
			return setTimeout(async () => {
				const db = mongodb.db('clashperk').collection('clangames');
				const data = await db.findOne({ tag: clan.tag });
				return this.getList(clan, data, tags.map(t => t.tag));
			}, 122 * 1000);
		}

		const db = mongodb.db('clashperk').collection('clangames');
		const data = await db.findOne({ tag: clan.tag });
		const updated = await this.getList(clan, data, clan.memberList.map(m => m.tag));

		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache && cache.updatedAt) {
				if (new Date() - new Date(cache.updatedAt) >= this.timer(cache)) {
					cache.updatedAt = new Date();
					this.cached.set(id, cache);
					await this.permissionsFor(id, cache, clan, updated);
				}
			} else if (cache) {
				cache.updatedAt = new Date();
				this.cached.set(id, cache);
				await this.permissionsFor(id, cache, clan, updated);
			}
		}

		return Promise.resolve();
	}

	timer(cache) {
		const patron = this.client.patron.get(cache.guild, 'guild', false);
		return patron === true ? 15 * 60 * 1000 : 30 * 60 * 1000;
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
		const members = this.filter(updated.collection, updated.data);
		const total = members.reduce((a, b) => a + b.points || 0, 0);
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${clan.members}/50]`,
				`\`\`\`\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.slice(0, 55)
					.map((m, i) => {
						const points = this.padStart(m.points || '0');
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
					}).join('\n'),
				'```'
			])
			.setFooter(`Points: ${total} [Avg: ${(total / clan.members).toFixed(2)}]`)
			.setTimestamp();
		return embed;
	}

	async update(clan, data, collection) {
		const $set = {};
		if (data) {
			for (const member of collection) {
				// Update points of new clan members
				if (member.tag in data.members === false) {
					$set.name = clan.name;
					$set.tag = clan.tag;
					$set[`members.${member.tag}`] = { name: member.name, tag: member.tag, points: member.points };
				}

				// Update points of missing and existing clan members
				if (member.tag in data.members) {
					if (member.points === data.members[member.tag].points) continue;
					$set.name = clan.name;
					$set.tag = clan.tag;
					$set[`members.${member.tag}.gain`] = member.points - data.members[member.tag].points;
					if (member.points - data.members[member.tag].points >= 4000 && !data.members[member.tag].endedAt) {
						$set[`members.${member.tag}.endedAt`] = new Date();
					}
				}
			}

			const tags = clan.memberList.map(m => m.tag);
			const members = tags.map(member => {
				const points = data.members && member.tag in data.members
					? member.points - data.members[member.tag].points
					: 0;
				return points;
			});
			const gained = Object.values(data.members || {})
				.filter(x => x.gain && x.gain > 0 && !tags.includes(x.tag))
				.map(x => x.gain);
			const total = members.concat(gained)
				.map(x => x.points > 4000 ? 4000 : x.points)
				.reduce((a, b) => a + b, 0);
			$set.total = total;
			if (total >= 50000 && !data.endedAt) $set.endedAt = new Date();
		} else {
			// update points of new clan members if db does not exist
			for (const member of collection) {
				$set.name = clan.name;
				$set.tag = clan.tag;
				$set.expiresAt = new Date(this.ISO.START);
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
			const points = player.achievements
				? player.achievements.find(a => a.name === 'Games Champion')
				: { value: 0 };
			collection.push({
				name: player.name,
				tag: player.tag,
				points: points.value
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
				? member.points - data.members[member.tag].points
				: null;
			return { tag: member.tag, name: member.name, points };
		});

		const tags = memberList.map(m => m.tag);
		const excess = Object.values(data.members)
			.filter(x => x.gain && x.gain > 0 && !tags.includes(x.tag))
			.map(x => ({ name: x.name, tag: x.tag, points: x.gain }));
		const sorted = members.concat(excess)
			.sort((a, b) => b.points - a.points)
			.map(x => ({ name: x.name, tag: x.tag, points: x.points > 4000 ? 4000 : x.points }));
		return sorted.filter(item => item.points).concat(sorted.filter(item => !item.points));
	}

	get ISO() {
		const date = this.client.settings.get('global', 'gameEvent', 22);
		const now = new Date();
		const START = [
			`${now.getFullYear()}`,
			`${now.getMonth() + 1}`.padStart(2, '0'),
			`${date}`
		].join('-');

		const END = [
			`${now.getFullYear()}`,
			`${now.getMonth() + 1}`.padStart(2, '0'),
			`${date + 6}T10:00:00Z`
		].join('-');

		return { START, END };
	}

	event() {
		return new Date() >= new Date(this.ISO.START) && new Date() <= new Date(this.ISO.END);
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async player(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.CWL_AND_CLAN_GAMES_TOKEN}`
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;
		return res.json().catch(() => null);
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
	}

	async _init() {
		// Initialize-Database
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
					color: data.color,
					tag: data.tag
				});
			}
		});
	}

	async flush(intervalId) {
		if (this.event()) return null;

		await this.init();
		this.cached.clear();
		await mongodb.db('clashperk')
			.collection('clangameslogs')
			.updateMany({}, { $unset: { message: '' } });
		await mongodb.db('clashperk')
			.collection('clangames')
			.updateMany({}, { $set: { expiresAt: new Date() } });
		this.client.settings.delete('global', 'gameEvent');
		return clearInterval(intervalId);
	}

	async _flush() {
		const intervalId = setInterval(() => this.flush(intervalId), 5 * 60 * 1000);
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
