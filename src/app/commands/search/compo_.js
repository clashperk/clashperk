const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const Resolver = require('../../struct/Resolver');
const { townHallEmoji, emoji } = require('../../util/emojis');
const API_TOKENS = process.env.API_TOKENS.split(',');

class ThCompoCommand extends Command {
	constructor() {
		super('th-compo_', {
			aliases: ['compo_'],
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
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 3000;
		return 10000;
	}

	async exec(message, { data }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const hrStart = process.hrtime();
		const list = data.memberList.map(m => m.tag);
		const urls = [];
		let index = 0;
		for (const tag of data.memberList.map(m => m.tag)) {
			if (index === 9) index = 0;
			urls.push(fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
				method: 'GET',
				headers: { accept: 'application/json', authorization: `Bearer ${API_TOKENS[index]}` }
			}));
			index += 1;
		}
		const responses = await new Promise.all(urls);
		const fetched = await new Promise.all(responses);

		const reduced = fetched.reduce((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map(entry => ({ level: entry[0], total: entry[1] }))
			.sort((a, b) => b.level - a.level);
		const avg = townHalls.reduce((p, c) => p + (c.total * c.level), 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setColor(0x5970c1)
			.setThumbnail(data.badgeUrls.small)
			.setDescription(townHalls.map(th => `${townHallEmoji[th.level]} ${this.padStart(th.total)}`))
			.setFooter(`Avg: ${avg.toFixed(2)} [${data.members}/50]`, 'https://cdn.discordapp.com/emojis/696655174025871461.png');

		const diff = process.hrtime(hrStart);
		const sec = diff[0] > 0 ? `${diff[0].toFixed(2)} sec` : null;
		return message.util.send(`*\u200b**Executed in ${sec || `${(diff[1] / 1000000).toFixed(2)} ms`}**\u200b*`, { embed });
	}

	padStart(msg) {
		return msg.toString().padStart(2, '0');
	}
}

module.exports = ThCompoCommand;
