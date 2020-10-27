const { MessageEmbed, Message } = require('discord.js');
const { mongodb } = require('../struct/Database');
const { emoji } = require('../util/emojis');
const { ObjectId } = require('mongodb');
const { Collection } = require('discord.js');

class ClanEmbed {
	constructor(client) {
		this.client = client;
		this.cached = new Collection();
		this.lastReq = {
			id: null,
			count: 0
		};
	}

	async exec(tag, clan) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			await this.permissionsFor(id, cache, clan);
		}

		return clans.clear();
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async throttle(id) {
		if (this.lastReq.id === id) {
			this.lastReq.count += 1;
			this.lastReq.id = id;
		} else {
			this.lastReq.count = 0;
			this.lastReq.id = id;
		}

		if (this.lastReq.count >= 4) await this.delay(250);
		return Promise.resolve();
	}

	async permissionsFor(id, cache, clan) {
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
				await this.throttle(channel.id);
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
		const embed = await this.embed(id, clan);
		const message = await channel.send({ embed })
			.catch(() => null);

		if (message) {
			try {
				const cache = this.cached.get(id);
				cache.message = message.id;
				this.cached.set(id, cache);
				const collection = mongodb.db('clashperk').collection('clanembedlogs');
				await collection.updateOne({ clan_id: ObjectId(id) }, { $set: { message: message.id } });
			} catch (error) {
				this.client.logger.warn(error, { label: 'MONGODB_ERROR' });
			}
		}

		return message;
	}

	async edit(id, message, clan) {
		const embed = await this.embed(id, clan);
		if (message instanceof Message === false) {
			const cache = this.cached.get(id);
			cache.msg = null;
			this.cached.set(id, cache);
			return null;
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

	async embed(id, clan) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setTimestamp()
			.setColor(cache.color)
			.setTitle(`${clan.name} (${clan.tag})`)
			.setThumbnail(clan.badgeUrls.medium)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`);
		if (cache.embed.description) embed.setDescription(cache.embed.description);
		else embed.setDescription(clan.description);

		if (cache.embed.userId) {
			embed.addField(`${emoji.owner} Leader`, `<@!${cache.embed.userId}>`);
		}

		if (cache.embed.accepts) {
			embed.addField(`${emoji.townhall} Accepted Town-Hall`, cache.embed.accepts);
		}

		embed.addField(`${emoji.clan} War Info`, [
			`${clan.warWins} wins, ${clan.isWarLogPublic ? `${clan.warLosses} losses, ${clan.warTies} ties,` : ''} win streak ${clan.warWinStreak}`
		]);

		embed.setFooter(`Members: ${clan.members}`, this.client.user.displayAvatarURL());
		return embed;
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('clanembedlogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(ObjectId(data.clan_id).toString(), {
					// guild: data.guild,
					channel: data.channel,
					message: data.message,
					color: data.color,
					embed: data.embed,
					tag: data.tag
				});
			}
		});
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('clanembedlogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			// guild: data.guild,
			channel: data.channel,
			message: data.message,
			color: data.color,
			embed: data.embed,
			tag: data.tag
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanEmbed;
