const { mongodb } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const { leagueEmoji, blueNum, redNum, emoji } = require('../util/emojis');
const { ObjectId } = require('mongodb');

class ClanEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	exec(id, data) {
		const cache = this.cached.get(id);
		if (cache) {
			return this.permissionsFor(id, cache, data);
		}
	}

	permissionsFor(id, cache, data) {
		const permissions = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				return this.handleMessage(id, channel, data);
			}
		}
	}

	async handleMessage(id, channel, data) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(`${data.clan.name} (${data.clan.tag})`, data.clan.badge)
			.setFooter(`${data.clan.members}/50`, this.client.user.displayAvatarURL())
			.setTimestamp();

		if (data.donated.length) {
			embed.addField('Donated', [
				data.donated.map(m => {
					if (m.donated > 200) {
						const [div, mod] = this.divmod(m.donated);
						const list = [`\u200e${leagueEmoji[m.league]} ${blueNum[div > 900 ? 900 : div]} ${m.name}`];
						if (mod > 0) return list.concat(`\u200e${leagueEmoji[m.league]} ${blueNum[mod]} ${m.name}`).join('\n');
						return list.join('\n');
					}
					return `\u200e${leagueEmoji[m.league]} ${blueNum[m.donated]} ${m.name}`;
				}).join('\n').substring(0, 1024)
			]);
		}

		if (data.received.length) {
			embed.addField('Received', [
				data.received.map(m => {
					if (m.received > 100) {
						const [div, mod] = this.divmod(m.received);
						const list = [`\u200e${leagueEmoji[m.league]} ${redNum[div > 900 ? 900 : div]} ${m.name}`];
						if (mod > 0) return list.concat(`\u200e${leagueEmoji[m.league]} ${redNum[mod]} ${m.name}`).join('\n');
						return list.join('\n');
					}
					return `\u200e${leagueEmoji[m.league]} ${redNum[m.received]} ${m.name}`;
				}).join('\n').substring(0, 1024)
			]);
		}

		if (data.unmatched && (data.unmatched.left || data.unmatched.joined)) {
			embed.addField('Unmatched', [
				data.unmatched.joined > 0
					? `${emoji.mem_blue} ${blueNum[data.unmatched.joined]} Joined`
					: '',
				data.unmatched.left > 0
					? `${emoji.mem_red} ${redNum[data.unmatched.left]} Left`
					: ''
			]);
		}

		return channel.send({ embed }).catch(() => null);
	}

	divmod(num) {
		return [Math.floor(num / 100) * 100, num % 100];
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('donationlogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(ObjectId(data.clan_id).toString(), {
					// guild: data.guild,
					channel: data.channel,
					color: data.color
				});
			}
		});
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('donationlogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			// guild: data.guild,
			channel: data.channel,
			color: data.color
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanEvent;
