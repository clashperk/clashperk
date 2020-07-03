const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const Resolver = require('../../struct/Resolver');
const { emoji, townHallEmoji } = require('../../util/emojis');
const { Util } = require('discord.js');
const TOKENS = process.env.$KEYS.split(',');

class CWLTopCommand extends Command {
	constructor() {
		super('cwl-top', {
			aliases: ['cwl-legends', 'cwl-top', 'cwl-mvp'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: 'War League Legend scoreboard of the clan.',
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
		const memberList = fetched.map(m => {
			const star = m.achievements
				? m.achievements.find(achievement => achievement.name === 'War League Legend')
				: 0;
			const member = { townHallLevel: m.townHallLevel, name: m.name, cwlStar: star.value };
			return member;
		});

		const items = this.sort(memberList);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'War League Legend Scoreboard',
				`${emoji.townhall}\`\u200e STAR  ${this.padEnd('NAME')}\``,
				items.slice(0, 30)
					.filter(m => m.cwlStar !== 0)
					.map(member => {
						const name = this.padEnd(member.name);
						const star = this.padStart(member.cwlStar.toString());
						return `${townHallEmoji[member.townHallLevel]}\`\u200e ${star}  ${name}\``;
					})
					.join('\n')
			]);

		return message.util.send({ embed });
	}

	sort(items) {
		return items.sort((a, b) => b.cwlStar - a.cwlStar);
	}

	padStart(msg) {
		return msg.padStart(4, ' ');
	}

	padEnd(data) {
		return Util.escapeInlineCode(data).padEnd(20, ' ');
	}
}

module.exports = CWLTopCommand;
