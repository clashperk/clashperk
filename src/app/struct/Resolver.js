const fetch = require('node-fetch');
const { mongodb } = require('./Database');
const { status } = require('../util/constants');
const { MessageEmbed } = require('discord.js');
const TOKENS = process.env.$KEYS.split(',');
const cached = new Map();

class Reslover {
	static async resolve(message, args, boolean = false) {
		const member = this.isMember(message, args);
		if (boolean) {
			if (member) {
				const data = await mongodb.db('clashperk')
					.collection('linkedusers')
					.findOne({ user: member.id });

				if (data && data.tags && data.tags[0]) return this.player(data.tags[0]);
				const embed = new MessageEmbed()
					.setColor(0xf30c11);
				if (message.author.id !== member.id) {
					embed.setDescription([
						`Couldn't find a player linked to **${member.user.tag}!**`
					]);
				} else {
					embed.setDescription([
						'Please provide a player tag and try again!'
					]);
				}

				return { status: 404, embed };
			}

			return this.player(args);
		}

		if (member) {
			const data = await mongodb.db('clashperk')
				.collection('linkedclans')
				.findOne({ user: member.id });

			if (data) return this.clan(data.tag);
			const embed = new MessageEmbed()
				.setColor(0xf30c11);
			if (message.author.id !== member.id) {
				embed.setDescription([
					`Couldn't find a clan linked to **${member.user.tag}!**`
				]);
			} else {
				embed.setDescription([
					'Please provide a clan tag and try again!'
				]);
			}

			return { status: 404, embed };
		}

		return this.clan(args);
	}


	static isMember(message, args) {
		if (!args) return message.member;
		const mention = args.match(/<@!?(\d{17,19})>/);
		const id = args.match(/^\d+$/);
		if (id) return message.guild.members.cache.get(id[0]) || null;
		if (mention) return message.guild.members.cache.get(mention[1]) || null;
		return null;
	}

	static async player(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/%23${this.format(tag)}`, {
			method: 'GET', timeout: 3000, headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).catch(() => null);

		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11);

		if (!res) return { status: 504, embed: embed.setDescription(status(504)) };
		if (!res.ok) return { status: res.status || 504, embed: embed.setDescription(status(res.status || 504)) };
		const data = await res.json();
		return this.assign(data, res);
	}

	static async clan(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/%23${this.format(tag)}`, {
			method: 'GET', timeout: 3000, headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).catch(() => null);

		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11);

		if (!res) return { status: 504, embed: embed.setDescription(status(504)) };
		if (!res.ok) return { status: res.status || 504, embed: embed.setDescription(status(res.status || 504)) };
		const data = await res.json();
		return this.assign(data, res);
	}

	static format(tag) {
		return tag.toUpperCase().replace(/#/g, '').replace(/O|o/g, '0');
	}

	static assign(data, res) {
		return Object.assign({ status: 200, 'max-age': Math.floor(res.headers.raw()['cache-control'][0].split('=')[1]) }, data);
	}

	static async fetch(data) {
		// if (cached.has(data.tag)) return cached.get(data.tag).data;
		const KEYS = TOKENS.map(token => ({ n: Math.random(), token })).sort((a, b) => a.n - b.n).map(a => a.token);
		const requests = data.memberList.map((m, i) => {
			const req = {
				url: `https://api.clashofclans.com/v1/players/${encodeURIComponent(m.tag)}`,
				option: {
					method: 'GET',
					headers: { accept: 'application/json', authorization: `Bearer ${KEYS[i % KEYS.length]}` }
				}
			};
			return req;
		});

		const responses = await Promise.all(requests.map(req => fetch(req.url, req.option)));
		return Promise.all(responses.map(res => res.json()));
		// this.set(data.tag, fetched, data['max-age']);
	}

	static set(tag, fetched, time) {
		console.log(time);
		return cached.set(tag, {
			data: fetched,
			timer: setTimeout(() => {
				clearTimeout(tag);
				cached.delete(tag);
			}, time * 1000)
		});
	}

	static verifyEmbed(data, code) {
		const embed = new MessageEmbed()
			.setAuthor(`${data.name}`, data.badgeUrls.small)
			.setDescription([
				'**Clan Description**',
				`${data.description}`,
				'',
				'**Verify Your Clan**',
				`Add the code \`${code}\` at the end of the clan description. It's a security feature of the bot to ensure you are a Leader or Co-Leader in the clan.`,
				'If you\'ve already added the code please wait at least 1 min before you run the command again and remove the code after verification.'
			]);
		return embed;
	}

	static limitEmbed() {
		const embed = new MessageEmbed()
			.setDescription([
				'You can only claim 2 clans per guild!',
				'',
				'**Want more than that?**',
				'Consider subscribing to one of our premium plans on Patreon',
				'',
				'[Become a Patron](https://www.patreon.com/bePatron?u=14584309)'
			])
			.setColor(5861569);

		return embed;
	}
}

module.exports = Reslover;
