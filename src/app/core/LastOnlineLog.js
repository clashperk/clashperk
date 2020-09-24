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

	async exec(tag, clan, members) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(id, cache, clan, members);
		}

		return clans.clear();
	}

	async permissionsFor(id, cache, clan, members) {
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
				return this.handleMessage(id, channel, clan, members);
			}
		}
	}

	async handleMessage(id, channel, clan, members) {
		const cache = this.cached.get(id);

		if (cache && !cache.message) {
			return this.sendNew(id, channel, clan, members);
		}

		if (cache && cache.msg) {
			return this.edit(id, cache.msg, clan, members);
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
			const msg = await this.sendNew(id, channel, clan, members);
			if (!msg) return;
			cache.msg = message;
			return this.cached.set(id, cache);
		}

		if (!message.deleted) {
			const msg = await this.edit(id, message, clan, members);
			if (!msg) return;
			cache.msg = message;
			return this.cached.set(id, cache);
		}
	}

	async sendNew(id, channel, clan, members) {
		const embed = await this.embed(clan, id, members);
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

	async edit(id, message, clan, members) {
		const embed = await this.embed(clan, id, members);
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
					return this.sendNew(id, message.channel, clan, members);
				}
				return null;
			});

		return msg;
	}

	async embed(clan, id, members) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Last Online Board [${clan.members}/50]`,
				`\`\`\`\u200e${'LAST-ON'.padStart(7, ' ')}  ${'NAME'.padEnd(18, ' ')}`,
				members.map(m => `${m.lastSeen ? this.format(m.lastSeen + 1e3) : ''.padStart(7, ' ')}  ${m.name}`)
					.join('\n'),
				'\`\`\`'
			])
			.setFooter('Last Updated')
			.setTimestamp();

		return embed;
	}

	format(ms) {
		if (ms > 864e5) {
			return moment.duration(ms).format('d[d] H[h]', { trim: 'both mid' }).padStart(7, ' ');
		} else if (ms > 36e5) {
			return moment.duration(ms).format('H[h] m[m]', { trim: 'both mid' }).padStart(7, ' ');
		}
		return moment.duration(ms).format('m[m] s[s]', { trim: 'both mid' }).padStart(7, ' ');
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
