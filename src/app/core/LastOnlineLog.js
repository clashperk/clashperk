const { MessageEmbed, Message } = require('discord.js');
const { mongodb } = require('../struct/Database');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const { Collection } = require('discord.js');

class LastOnlineEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Collection();
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
				this.client.logger.warn(error, { label: 'LAST_ONLINE_FETCH_MESSAGE' });
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
				const collection = mongodb.db('clashperk').collection('lastonlinelogs');
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
				`Last Online Board [${clan.members}/50]`,
				`\`\`\`\u200e${'LAST-ON'.padStart(7, ' ')}  ${'NAME'.padEnd(18, ' ')}`,
				this.filter(clan, updated)
					.map(m => `${m.lastOnline ? this.format(m.lastOnline + 1e3) : ''.padStart(7, ' ')}  ${m.name}`)
					.join('\n'),
				'\`\`\`'
			])
			.setFooter('Last Updated')
			.setTimestamp();

		return embed;
	}

	filter(clan, db) {
		if (!db) {
			return clan.memberList.map(member => ({ tag: member.tag, name: member.name, lastOnline: null, count: 0 }));
		}

		if (db && !db.members) {
			return clan.memberList.map(member => ({ tag: member.tag, name: member.name, lastOnline: null, count: 0 }));
		}

		const members = clan.memberList.map(member => {
			const counts = [];
			if (member.tag in db.members && db.members[member.tag].activities) {
				for (const [key, value] of Object.entries(db.members[member.tag].activities)) {
					if (new Date().getTime() - new Date(key).getTime() <= 864e5) {
						counts.push(value);
					}
				}
			}

			return {
				tag: member.tag,
				name: member.name,
				lastOnline: member.tag in db.members
					? new Date() - new Date(db.members[member.tag].lastOnline)
					: null,
				count: counts.reduce((p, c) => p + c, 0)
			};
		});

		const sorted = members.sort((a, b) => a.lastOnline - b.lastOnline);
		return sorted.filter(item => item.lastOnline).concat(sorted.filter(item => !item.lastOnline));
	}

	format(time) {
		if (time > 864e5) {
			return moment.duration(time).format('d[d] H[h]', { trim: 'both mid' }).padStart(7, ' ');
		} else if (time > 36e5) {
			return moment.duration(time).format('H[h] m[m]', { trim: 'both mid' }).padStart(7, ' ');
		}

		return moment.duration(time).format('m[m] s[s]', { trim: 'both mid' }).padStart(7, ' ');
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('lastonlinelogs')
			.find()
			.toArray();

		const filtered = collection.filter(data => this.client.guilds.cache.get(data.guild));
		filtered.forEach(data => {
			this.cached.set(ObjectId(data.clan_id).toString(), {
				// guild: data.guild,
				channel: data.channel,
				message: data.message,
				color: data.color,
				tag: data.tag
			});
		});

		return new Promise(resolve => {
			this.client.grpc.initOnlineHandler({
				data: JSON.stringify(filtered)
			}, (err, res) => resolve(res.data));
		});
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('lastonlinelogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			// guild: data.guild,
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

module.exports = LastOnlineEvent;
