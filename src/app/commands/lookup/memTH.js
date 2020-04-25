const { Command, Flag, Argument } = require('discord-akairo');
const Fetch = require('../../struct/Fetch');
const fetch = require('node-fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');
const { emoji, townHallEmoji } = require('../../util/emojis');
const { Util } = require('discord.js');

const API = process.env.APIS.split(',');

class MembersTHCommand extends Command {
	constructor() {
		super('members-th', {
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: 'Displays a list of clan members.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			optionFlags: ['--th', '-th', 'th']
		});
	}

	*args() {
		const townhall = yield {
			match: 'option',
			flag: ['--th', '-th', 'th'],
			type: Argument.range('integer', 1, 13, true)
		};

		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return Fetch.clan(str).then(data => {
						if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_accounts')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				if (!data.clan) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return Fetch.clan(data.clan).then(data => {
					if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
					return data;
				});
			},
			prompt: {
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};

		return { data, townhall };
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 20000;
	}

	async exec(message, { data, townhall }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);

		const list = data.memberList.map(m => m.tag);
		const funcs = new Array(Math.ceil(list.length / 5)).fill().map(() => list.splice(0, 5))
			.map((tags, index) => async (collection = []) => {
				for (const tag of tags) {
					const member = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
						method: 'GET',
						headers: { accept: 'application/json', authorization: `Bearer ${API[index]}` }
					}).then(res => res.json());
					collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
				}
				return collection;
			});

		const requests = await Promise.all(funcs.map(func => func()));

		const array = [];
		for (const arr of requests) {
			for (const member of arr) {
				array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
			}
		}

		const items = this.sort(array);
		const filter = items.filter(arr => arr.townHallLevel === townhall);

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);

		const pages = [
			this.paginate(townhall ? filter : items, 0, 25)
				.items.map(member => `${townHallEmoji[member.townHallLevel]} \`\u200e${this.padStart(member.townHallLevel)}\`\u2002\`\u2002${member.name.padEnd(20, '\u2002')}\u200f\`\u2002\`${Util.escapeInlineCode(member.tag).padEnd(12, '\u2002')}\``),
			this.paginate(townhall ? filter : items, 25, 50)
				.items.map(member => `${townHallEmoji[member.townHallLevel]} \`\u200e${this.padStart(member.townHallLevel)}\`\u2002\`\u2002${member.name.padEnd(20, '\u2002')}\u200f\`\u2002\`${Util.escapeInlineCode(member.tag).padEnd(12, '\u2002')}\``)
		];

		if (!pages[1].length) return message.util.send({ embed: embed.setDescription(pages[0].join('\n')) });

		const msg = await message.util.send({
			embed: embed.setDescription(pages[0].join('\n'))
				.setFooter('Page 1/2')
		});

		for (const emoji of ['⬅️', '➡️']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 45000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				await msg.edit({
					embed: embed.setDescription(pages[1].join('\n'))
						.setFooter('Page 2/2')
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
			if (reaction.emoji.name === '⬅️') {
				await msg.edit({
					embed: embed.setDescription(pages[0].join('\n'))
						.setFooter('Page 1/2')
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
		});

		collector.on('end', async () => {
			await msg.reactions.removeAll().catch(() => null);
			return message;
		});
		return message;
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	padStart(num) {
		return num.toString().padStart(2, ' ');
	}

	sort(items) {
		return items.sort((a, b) => b.townHallLevel - a.townHallLevel);
	}
}

module.exports = MembersTHCommand;
