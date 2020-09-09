const { status } = require('../util/constants');
const { MessageEmbed } = require('discord.js');
const { Client } = require('clashofclans.js');
const TOKENS = process.env.CLASH_TOKENS.split(',');
const { mongodb } = require('./Database');
const client = new Client({
	timeout: 5000,
	token: process.env.DEVELOPER_TOKEN
});

class Reslover {
	static async resolve(message, args, boolean = false) {
		const tag = /^#?[PYLQGRJCUV0O289]+$/i.test(args);
		if (boolean) {
			if (tag) return this.player(args);
			const member = await this.isMember(message, args);
			const embed = new MessageEmbed().setColor(0xf30c11);
			if (!member) {
				return {
					status: 404,
					embed: embed
						.setAuthor('Error')
						.setDescription(status(404))
				};
			}
			const data = await mongodb.db('clashperk')
				.collection('linkedusers')
				.findOne({ user: member.id });

			if (data && data.tags && data.tags[0]) return this.player(data.tags[0]);

			if (message.author.id !== member.id) {
				embed.setDescription([
					`Couldn't find a player linked to **${member.user.tag}!**`
				]);
			} else {
				embed.setDescription([
					'**Please provide a player tag and try again!**'
				]);
			}

			return { status: 404, embed };
		}

		if (tag) return this.clan(args);
		const member = await this.isMember(message, args);
		const embed = new MessageEmbed().setColor(0xf30c11);
		if (!member) {
			return {
				status: 404,
				embed: embed
					.setAuthor('Error')
					.setDescription(status(404))
			};
		}

		const data = await mongodb.db('clashperk')
			.collection('linkedclans')
			.findOne({ user: member.id });

		if (data) return this.clan(data.tag);

		if (message.author.id !== member.id) {
			embed.setDescription([
				`Couldn't find a clan linked to **${member.user.tag}!**`
			]);
		} else {
			embed.setDescription([
				'**Please provide a clan tag and try again!**'
			]);
		}

		return { status: 404, embed };
	}


	static async isMember(message, args) {
		if (!args) return message.member;
		const mention = args.match(/<@!?(\d{17,19})>/);
		if (mention) return message.guild.members.cache.get(mention[1]) || null;
		const id = args.match(/^\d{17,19}/);
		if (id) {
			if (message.guild.members.cache.has(id[0])) return message.guild.members.cache.get(id[0]);
			return message.guild.members.fetch(id[0]).catch(() => null);
		}
		return null;
	}

	static async player(tag) {
		const data = await client.fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(this.format(tag))}`, {
			token: process.env.DEVELOPER_TOKEN
		}).catch(() => null);
		const embed = new MessageEmbed()
			.setColor(0xf30c11)
			.setAuthor('Error');
		if (!data) return { status: 504, embed: embed.setDescription(status(504)) };
		if (!data.ok) return { status: data.status, embed: embed.setDescription(status(data.status)) };
		return data;
	}

	static async clan(tag) {
		const data = await client.fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(this.format(tag))}`, {
			token: process.env.DEVELOPER_TOKEN
		}).catch(() => null);
		const embed = new MessageEmbed()
			.setColor(0xf30c11)
			.setAuthor('Error');
		if (!data) return { status: 504, embed: embed.setDescription(status(504)) };
		if (!data.ok) return { status: data.status, embed: embed.setDescription(status(data.status)) };
		return data;
	}

	static format(tag) {
		return `#${tag.toUpperCase().replace(/#/g, '').replace(/O|o/g, '0')}`;
	}

	static async fetch(data) {
		const KEYS = TOKENS.map(token => ({ n: Math.random(), token })).sort((a, b) => a.n - b.n).map(a => a.token);
		const requests = data.memberList.map((m, i) => {
			const req = {
				url: `https://api.clashofclans.com/v1/players/${encodeURIComponent(m.tag)}`,
				option: {
					token: KEYS[i % KEYS.length]
				}
			};
			return req;
		});

		return Promise.all(requests.map(req => client.fetch(req.url, req.option)));
	}

	static verifyEmbed(data, code) {
		const embed = new MessageEmbed()
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.small)
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
				'Please consider supporting us on patreon!',
				'',
				'[Become a Patron](https://www.patreon.com/join/clashperk)'
			]);

		return embed;
	}
}

module.exports = Reslover;
