const { MessageEmbed, Message } = require('discord.js');
const { mongodb } = require('../struct/Database');
const { ObjectId } = require('mongodb');
const moment = require('moment');

class LastOnlineEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async exec(id, clan, update) {
		const cache = this.cached.get(id);
		if (Object.keys(update).length && cache) {
			try {
				const collection = mongodb.db('clashperk').collection('lastonlines');
				await collection.updateOne({ tag: clan.tag }, update, { upsert: true });
			} catch (error) {
				this.client.logger.error(error, { label: 'MONGODB_ERROR' });
			}
		}

		if (cache) {
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

		if (cache && !cache.message) {
			return this.sendNew(id, channel, clan);
		}

		if (cache && cache.msg) {
			return this.edit(id, cache.msg, clan);
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
				const collection = mongodb.db('clashperk').collection('lastonlinelogs');
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
		const data = await mongodb.db('clashperk')
			.collection('lastonlines')
			.findOne({ tag: clan.tag });

		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Last Online Board [${clan.members}/50]`,
				`\`\`\`\u200e${'LAST-ON'.padStart(7, ' ')}  1D  ${'NAME'.padEnd(18, ' ')}`,
				this.filter(data, clan)
					.map(m => `${m.lastOnline ? this.format(m.lastOnline + 1e3) : ''.padStart(7, ' ')}  ${m.count.toString().padStart(2, ' ')} ${m.name}`)
					.join('\n'),
				'\`\`\`'
			])
			.setFooter('Last Updated')
			.setTimestamp();

		return embed;
	}

	filter(data, clan) {
		if (!data) {
			return clan.memberList.map(member => ({ tag: member.tag, name: member.name, lastOnline: null }));
		}

		if (data && !data.members) {
			return clan.memberList.map(member => ({ tag: member.tag, name: member.name, lastOnline: null }));
		}

		const members = data.memberList.map(member => {
			const counts = [];
			if (member.tag in clan.members && clan.members[member.tag].activities) {
				for (const [key, value] of Object.entries(clan.members[member.tag].activities)) {
					if (new Date().getTime() - new Date(key).getTime() <= 864e5) {
						counts.push(value);
					}
				}
			}

			return {
				tag: member.tag,
				name: member.name,
				lastOnline: member.tag in clan.members
					? new Date() - new Date(clan.members[member.tag].lastOnline)
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

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(ObjectId(data.clan_id).toString(), {
					// guild: data.guild,
					channel: data.channel,
					message: data.message,
					color: data.color
				});
			}
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
			color: data.color
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = LastOnlineEvent;
