const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const Resolver = require('../../struct/Resolver');
const { TOWN_HALLS, BLUE_EMOJI, RED_EMOJI, emoji } = require('../../util/Emojis');
const TOKENS = process.env.CLASH_TOKENS.split(',');
const fetch = require('node-fetch');

class ThCompoCommand extends Command {
	constructor() {
		super('townhall-compo', {
			aliases: ['compo', 'th-compo', 'th'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Calculates TH compositions of a clan.',
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
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		if (data.members < 1) return message.util.send(`\u200e**${data.name}** does not have any clan members...`);
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const hrStart = process.hrtime();
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
		const reduced = fetched.reduce((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map(arr => ({ level: arr[0], total: arr[1] }))
			.sort((a, b) => b.level - a.level);
		const avg = townHalls.reduce((p, c) => p + (c.total * c.level), 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setColor(this.client.embed(message))
			.setThumbnail(data.badgeUrls.small)
			.setDescription(townHalls.map(th => `${TOWN_HALLS[th.level]} ${th.level < 9 ? RED_EMOJI[th.total] : BLUE_EMOJI[th.total]}\u200b`))
			.setFooter(`Avg: ${avg.toFixed(2)} [${data.members}/50]`, 'https://cdn.discordapp.com/emojis/696655174025871461.png');

		const diff = process.hrtime(hrStart);
		const sec = diff[0] > 0 ? `${diff[0].toFixed(2)} sec` : null;
		return message.util.send(`*\u200b**Executed in ${sec || `${(diff[1] / 1000000).toFixed(2)} ms`}**\u200b*`, { embed });
	}
}

module.exports = ThCompoCommand;
