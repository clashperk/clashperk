const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const Resolver = require('../../struct/Resolver');
const { townHallEmoji, emoji } = require('../../util/emojis');
const { stripIndent } = require('common-tags');
const { Util } = require('discord.js');
const TOKENS = process.env.$KEYS.split(',');

class WarWeightCommand extends Command {
	constructor() {
		super('warweight', {
			aliases: ['warweight', 'ww'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: 'List of clan members with townhall & heroes.',
				usage: '<clanTag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			}
		});
	}

	*args() {
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

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		if (data.members < 1) return message.util.send(`**${data.name}** does not have any clan members...`);
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
				heroes: m.heroes ? m.heroes.filter(a => a.village === 'home') : []
			};
			return member;
		});

		const memberList = this.sort(members);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);

		const header = stripIndent(`**${emoji.townhall}\`\u200e BK AQ GW RC  ${'NAME'.padEnd(20, ' ')}\`**`);
		const pages = [
			this.paginate(memberList, 0, 25)
				.items.map(member => {
					const heroes = this.heroes(member.heroes).map(hero => this.padStart(hero.level)).join(' ');
					return `${townHallEmoji[member.townHallLevel]}\`\u200e ${heroes}  ${this.padEnd(member.name.substring(0, 12))}\``;
				}),
			this.paginate(memberList, 25, 50)
				.items.map(member => {
					const heroes = this.heroes(member.heroes).map(hero => this.padStart(hero.level)).join(' ');
					return `${townHallEmoji[member.townHallLevel]}\`\u200e ${heroes}  ${this.padEnd(member.name.substring(0, 12))}\``;
				})
		];

		if (!pages[1].length) {
			return message.util.send({
				embed: embed.setDescription([
					header,
					pages[0].join('\n')
				])
			});
		}

		const msg = await message.util.send({
			embed: embed.setDescription([
				header,
				pages[0].join('\n')
			]).setFooter('Page 1/2')
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
					embed: embed.setDescription([
						header,
						pages[1].join('\n')
					]).setFooter('Page 2/2')
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
			if (reaction.emoji.name === '⬅️') {
				await msg.edit({
					embed: embed.setDescription([
						header,
						pages[0].join('\n')
					]).setFooter('Page 1/2')
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

	heroes(items) {
		return Object.assign([
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' }
		], items);
	}

	padStart(data) {
		return data.toString().padStart(2, ' ');
	}

	padEnd(data) {
		return Util.escapeInlineCode(data).padEnd(20, ' ');
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	sort(items) {
		return items
			.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);
	}
}

module.exports = WarWeightCommand;
