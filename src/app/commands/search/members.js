const { Command, Flag, Argument } = require('discord-akairo');
const fetch = require('node-fetch');
const Resolver = require('../../struct/Resolver');
const { emoji, leagueEmoji } = require('../../util/emojis');
const { Util } = require('discord.js');
const { stripIndent } = require('common-tags');
const API = process.env.API_TOKENS.split(',');

class MembersCommand extends Command {
	constructor() {
		super('members', {
			aliases: ['members', 'mem'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: 'List of clan members (--th to view th levels)',
				usage: '<clanTag>',
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
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data, townhall };
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 3000;
		return 10000;
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
					collection.push({
						name: member.name,
						tag: member.tag,
						townHallLevel: member.townHallLevel,
						heroes: member.heroes,
						league: member.league ? member.league.id : 29000000
					});
				}
				return collection;
			});

		const requests = await Promise.all(funcs.map(func => func()));

		const array = [];
		for (const arr of requests) {
			for (const member of arr) {
				array.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel, league: member.league });
			}
		}

		const items = this.sort(array);
		const filter = items.filter(arr => arr.townHallLevel === townhall);

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);

		const header = stripIndent(`${emoji.trophy} **\`\u200eTH ${'TAG'.padEnd(10, ' ')} ${'NAME'.padEnd(12, '\u2002')}\`**`);
		const pages = [
			this.paginate(townhall ? filter : items, 0, 25)
				.items.map(member => `${leagueEmoji[member.league]} \`\u200e${this.padStart(member.townHallLevel)} ${member.tag.padEnd(10, '\u2002')} ${Util.escapeInlineCode(member.name.substring(0, 11)).padEnd(12, '\u2002')}\``),
			this.paginate(townhall ? filter : items, 25, 50)
				.items.map(member => `${leagueEmoji[member.league]} \`\u200e${this.padStart(member.townHallLevel)} ${member.tag.padEnd(10, '\u2002')} ${Util.escapeInlineCode(member.name.substring(0, 11)).padEnd(12, '\u2002')}\``)
		];

		if (!pages[1].length) return message.util.send({ embed: embed.setDescription([header, pages[0].join('\n')]) });

		const msg = await message.util.send({
			embed: embed.setDescription([header, pages[0].join('\n')])
				.setFooter('Page 1/2')
		});

		await msg.react('⬇️');
		const collector = await msg.awaitReactions(
			(reaction, user) => reaction.emoji.name === '⬇️' && user.id === message.author.id,
			{ max: 1, time: 30000, errors: ['time'] }
		).catch(() => null);
		if (!msg.deleted) await msg.reactions.removeAll().catch(() => null);
		if (!collector || !collector.size) return;
		return message.channel.send({
			embed: embed.setDescription([header, pages[1].join('\n')])
				.setFooter('Page 2/2')
		});
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

module.exports = MembersCommand;
