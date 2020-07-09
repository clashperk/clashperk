const { leagueEmoji, blueNum, redNum, emoji } = require('../util/emojis');
const { mongodb } = require('../struct/Database');
const { MessageEmbed, WebhookClient } = require('discord.js');
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
			// 'MANAGE_WEBHOOKS',
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
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.clan.tag)}`)
			.setThumbnail(data.clan.badge)
			.setFooter(`${data.clan.members}/50`, this.client.user.displayAvatarURL())
			.setTimestamp();

		if (data.donated.length) {
			embed.addField(`${emoji.mem_blue} Donated`, [
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
			embed.addField(`${emoji.mem_red} Received`, [
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
			embed.addField(`${emoji.wrong} Unmatched`, [
				data.unmatched.joined > 0
					? `${emoji.mem_blue} ${blueNum[data.unmatched.joined]} Joined`
					: '',
				data.unmatched.left > 0
					? `${emoji.mem_red} ${redNum[data.unmatched.left]} Left`
					: ''
			]);
		}

		if (!cache.webhook) await this.createWebhook(channel, id);
		if (cache.webhook) {
			const webhook = new WebhookClient(cache.webhook.id, cache.webhook.token);
			try {
				await webhook.send({
					embeds: [embed],
					username: this.client.user.username,
					avatarURL: this.client.user.displayAvatarURL()
				});
			} catch (error) {
				if (error.code === 10015) {
					delete cache.webhook;
					this.cached.set(id, cache);
					await this.createWebhook(channel, id);
				}
			}

			return webhook;
		}

		return channel.send({ embed }).catch(() => null);
	}

	async createWebhook(channel, id) {
		if (!channel.permissionsFor(channel.guild.me).has(['MANAGE_WEBHOOKS'], false)) return null;
		const webhooks = await channel.fetchWebhooks().catch(() => null);
		let webhook = null;
		if (webhooks) {
			webhook = webhooks.filter(w => w.owner && w.owner.id === this.client.user.id).first();
		}

		if (!webhook && webhooks.size >= 10) {
			return null;
		}

		if (!webhook) {
			webhook = await channel.createWebhook(this.client.user.username, {
				avatar: this.client.user.displayAvatarURL(),
				reason: 'Webhook Created for Clan Log'
			});
		}

		const cache = this.cached.get(id);
		cache.webhook = { id: webhook.id, token: webhook.token };
		this.cached.set(id, cache);
		await mongodb.db('clashperk')
			.collection('donationlogs')
			.updateOne({ clan_id: ObjectId(id) }, { $set: { webhook: { id: webhook.id, token: webhook.token } } });
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
					color: data.color,
					webhook: data.webhook
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
			color: data.color,
			webhook: data.webhook
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanEvent;
