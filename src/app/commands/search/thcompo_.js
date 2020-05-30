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
		const tag = yield {
			type: 'string'
		};

		return { tag };
	}

	async exec(message, { tag }) {
		const hrStart = process.hrtime();
		const d = await fetch(`https://proxy.clashperk.xyz/v2/members/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: { accept: 'application/json', token: 'Kh524B8JlpjdcjQK36' }
		}).then(res => res.json());

		const embed = new MessageEmbed()
			.setAuthor(`${d.clan.name} (${d.clan.tag})`, d.clan.badgeUrls.small)
			.setColor(0x5970c1)
			.setThumbnail(d.clan.badgeUrls.small)
			.setDescription(d.townHalls.map(th => `${townHallEmoji[th.level]} ${this.padStart(th.total)}`))
			.setFooter(`Avg: ${d.avg.toFixed(2)} [${d.clan.members}/50]`, 'https://cdn.discordapp.com/emojis/696655174025871461.png');

		const diff = process.hrtime(hrStart);
		const sec = diff[0] > 0 ? `${diff[0].toFixed(2)} sec` : null;
		return message.util.send(`*\u200b**Executed in ${sec || `${(diff[1] / 1000000).toFixed(2)} ms`}**\u200b*`, { embed });
	}

	padStart(msg) {
		return msg.toString().padStart(2, '0');
	}
}

module.exports = ThCompoCommand;
