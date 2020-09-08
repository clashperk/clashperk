const { Command, Flag, Argument } = require('discord-akairo');
const fetch = require('node-fetch');
const Resolver = require('../../struct/Resolver');
const { emoji, leagueEmoji } = require('../../util/emojis');
const { Util } = require('discord.js');
const { stripIndent } = require('common-tags');
const TOKENS = process.env.CLASH_TOKENS.split(',');
const Excel = require('../../struct/ExcelHandler');

class MembersCommand extends Command {
	constructor() {
		super('members', {
			aliases: ['members', 'mem'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'ATTACH_FILES'],
			description: {
				content: 'List of clan members (--th to view th levels)',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--th', '-th', 'th']
		});
	}

	*args() {
		const townhall = yield {
			match: 'option',
			flag: ['--th', '-th', 'th'],
			type: Argument.range('integer', 3, 13, true)
		};

		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data, townhall };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data, townhall }) {
		if (data.members < 1) return message.util.send(`\u200e**${data.name}** does not have any clan members...`);
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
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
		const fetched = await Promise.all(responses.map(res => res.json()));
		const members = fetched.map(m => {
			const member = {
				name: m.name,
				tag: m.tag,
				townHallLevel: m.townHallLevel,
				heroes: m.heroes ? m.heroes.filter(a => a.village === 'home') : [],
				league: m.league ? m.league.id : 29000000
			};
			return member;
		});

		const items = this.sort(members);
		const patron = this.client.patron.check(message.author, message.guild);

		const filter = items.filter(arr => arr.townHallLevel === townhall);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		const header = stripIndent(`${emoji.trophy} **\`\u200eTH ${'TAG'.padEnd(10, ' ')} ${'NAME'.padEnd(15, '\u2002')}\`**`);
		const pages = [
			this.paginate(townhall ? filter : items, 0, 25)
				.items.map(member => `${leagueEmoji[member.league]} \`\u200e${this.padStart(member.townHallLevel)} ${member.tag.padEnd(10, '\u2002')} ${Util.escapeInlineCode(member.name.substring(0, 15)).padEnd(15, '\u2002')}\u200f\``),
			this.paginate(townhall ? filter : items, 25, 50)
				.items.map(member => `${leagueEmoji[member.league]} \`\u200e${this.padStart(member.townHallLevel)} ${member.tag.padEnd(10, '\u2002')} ${Util.escapeInlineCode(member.name.substring(0, 15)).padEnd(15, '\u2002')}\u200f\``)
		];

		if (!pages[1].length) return message.util.send({ embed: embed.setDescription([header, pages[0].join('\n')]) });

		let page = 0;
		const msg = await message.util.send({
			embed: embed.setDescription([header, pages[page].join('\n')])
				.setFooter(`Page 1/2 (${data.members}/50)`)
		});

		for (const emoji of ['⬅️', '➡️', '➕', '📥']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['➕', '⬅️', '➡️', '📥'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 90000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				if (page < 0) page = 1;
				if (page > 1) page = 0;

				await msg.edit({
					embed: embed.setDescription([header, pages[page].join('\n')])
						.setFooter(`Page ${page + 1}/2 (${data.members}/50)`)
				});
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 0) page = 1;
				if (page > 1) page = 0;

				await msg.edit({
					embed: embed.setDescription([header, pages[page].join('\n')])
						.setFooter(`Page ${page + 1}/2 (${data.members}/50)`)
				});
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}

			if (reaction.emoji.name === '➕') {
				if (page === 0) page = 1;
				else if (page === 1) page = 0;

				await collector.stop();
				return message.channel.send({
					embed: embed.setDescription([header, pages[page].join('\n')])
						.setFooter(`Page ${page + 1}/2 (${data.members}/50)`)
				});
			}

			if (reaction.emoji.name === '📥') {
				if (!patron) {
					await message.channel.send({
						embed: {
							description: '[Become a Patron](https://patreon.com/clashperk) to export members to Excel.'
						}
					});
				} else {
					const buffer = await Excel.memberList(items);
					await message.util.send({
						files: [{
							attachment: Buffer.from(buffer), name: `${data.name.toLowerCase()}_members.xlsx`
						}]
					});
				}
				return collector.stop();
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
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
