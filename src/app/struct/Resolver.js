const fetch = require('node-fetch');
const { mongodb } = require('./Database');
const { status } = require('../util/constants');
const { MessageEmbed } = require('discord.js');

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
					.setAuthor('Error')
					.setColor(0xf30c11)
					.setDescription([
						`Couldn't find a player linked to **${member.user.tag}!**`,
						'Either provide a tag or link a player to your account.'
					]);

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
				.setAuthor('Error')
				.setColor(0xf30c11)
				.setDescription([
					`Couldn't find a clan linked to **${member.user.tag}!**`,
					'Either provide a tag or link a clan to your account.'
				]);

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
			method: 'GET', timeout: 3000, headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
		}).catch(() => null);

		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11);

		if (!res) return { status: 504, embed: embed.setDescription(status(504)) };
		if (!res.ok) return { status: res.status || 504, embed: embed.setDescription(status(res.status || 504)) };
		const data = await res.json();
		return this.assign(data);
	}

	static async clan(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/%23${this.format(tag)}`, {
			method: 'GET', timeout: 3000, headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
		}).catch(() => null);

		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11);

		if (!res) return { status: 504, embed: embed.setDescription(status(504)) };
		if (!res.ok) return { status: res.status || 504, embed: embed.setDescription(status(res.status || 504)) };
		const data = await res.json();
		return this.assign(data);
	}

	static format(tag) {
		return tag.toUpperCase().replace(/#/g, '').replace(/O|o/g, '0');
	}

	static assign(data) {
		return Object.assign({ status: 200 }, data);
	}
}

module.exports = Reslover;
