const { mongodb } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const { leagueEmoji } = require('../util/emojis');

class ClanEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	exec(_id, data) {
		const cache = this.cached.get(_id);
		if (cache) {
			return this.permissionsFor(_id, cache, data);
		}
	}

	permissionsFor(_id, cache, data) {
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
				return this.handleMessage(_id, channel, data);
			}
		}
	}

	async handleMessage(_id, channel, data) {
		const cache = this.cached.get(_id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(data.clan.name, data.clan.badge)
			.setThumbnail(data.clan.badge)
			.setFooter(`${data.clan.members}/50`, this.client.user.displayAvatarURL())
			.setTimestamp();

		if (data.donated.length) {
			embed.addField('Donated', [
				data.donated.map(m => `${leagueEmoji[m.league]} **\`\u200e${this.formatNum(m.donated)}\`** \u2002${m.name}`)
					.join('\n')
					.substring(0, 1024)
			]);
		}

		if (data.received.length) {
			embed.addField('Received', [
				data.received.map(m => `${leagueEmoji[m.league]} **\`\u200e${this.formatNum(m.received)}\`** \u2002${m.name}`)
					.join('\n')
					.substring(0, 1024)
			]);
		}

		if (data.unmatched) {
			embed.addField('Unmatched', [
				data.unmatched.left > 0
					? `${data.unmatched.left} Member${data.unmatched.left === 1 ? '' : 's'} Left`
					: '',
				data.unmatched.joined > 0
					? `${data.unmatched.joined} Member${data.unmatched.joined === 1 ? '' : 's'} Joined`
					: ''
			]);
		}

		return channel.send({ embed });
	}

	formatNum(num) {
		return num < 10
			? num.toString()
				.padStart(2, '0')
				.padStart(3, '\u2002')
			: num.toString()
				.padStart(3, '\u2002');
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('donationlogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(data._id, {
					_id: data.id,
					guild: data.guild,
					channel: data.channel,
					color: data.color
				});
			}
		});
	}

	add(data) {
		return this.cached.set(data.id, {
			_id: data.id,
			guild: data.guild,
			channel: data.channel,
			color: data.color
		});
	}

	delete(_id) {
		return this.cached.delete(_id);
	}
}

module.exports = ClanEvent;
