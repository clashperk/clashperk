const { mongodb } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');

class LastOnlineEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async exec(id, clan, update) {
		const cache = this.cached.get(id);
		if (Object.keys(update).length) {
			await mongodb.db('clashperk')
				.collection('lastonlines')
				.updateOne({ tag: clan.tag }, update, { upsert: true })
				.catch(error => this.logger.error(error, { label: 'MONGO_ERROR' }));
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
				console.log('perm');
				return this.handleMessage(id, channel, clan);
			}
		}
	}

	async handleMessage(id, channel, clan) {
		const cache = this.cached.get(id);
		console.log(cache);
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
			await mongodb.db('clashperk')
				.collection('lastonlinelogs')
				.updateOne({ clan_id: id }, { $set: { message: message.id } })
				.catch(() => null);
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
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Last Online Board [${clan.members}/50]`,
				`\`\`\`\u200e${'Last On'.padStart(7, ' ')}   ${'Name'.padEnd(20, ' ')}\n${this.filter(clan)
					.map(m => `${m.lastOnline ? this.format(m.lastOnline + 1e3).padStart(7, ' ') : ''.padStart(7, ' ')}   ${this.padEnd(m.name)}`)
					.join('\n')}\`\`\``
			])
			.setFooter('Last Updated')
			.setTimestamp();

		return embed;
	}

	async filter(clan) {
		const data = await mongodb.db('cllashperk')
			.collection('lastonlines')
			.findOne({ tag: clan.tag });

		if (!data) {
			return clan.memberList.map(member => ({ tag: member.tag, name: member.name, lastOnline: null }));
		}

		const members = clan.memberList.map(member => {
			const lastOnline = member.tag in data.memberList
				? new Date() - new Date(data.members[member.tag].lastOnline)
				: null;
			return { tag: member.tag, name: member.name, lastOnline };
		});

		const sorted = members.sort((a, b) => a.lastOnline - b.lastOnline);

		return sorted.filter(item => item.lastOnline).concat(sorted.filter(item => !item.lastOnline));
	}

	format(time) {
		if (time > 864e5) {
			return moment.duration(time).format('d[d] H[h]', { trim: 'both mid' });
		} else if (time > 36e5) {
			return moment.duration(time).format('H[h] m[m]', { trim: 'both mid' });
		}

		return moment.duration(time).format('m[m] s[s]', { trim: 'both mid' });
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('lastonlinelogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(data.clan_id, {
					clan_id: data.clan_id,
					guild: data.guild,
					channel: data.channel,
					message: data.message
				});
			}
		});
	}

	add(data) {
		return this.cached.set(data.clan_id, {
			id: data.clan_id,
			guild: data.guild,
			channel: data.channel,
			message: data.message
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = LastOnlineEvent;
