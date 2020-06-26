const { Command, Flag } = require('discord-akairo');
const Resolver = require('../../struct/Resolver');
const { Util } = require('discord.js');

class DonationBoardCommand extends Command {
	constructor() {
		super('donations', {
			aliases: ['donations', 'donationboard', 'db', 'don'],
			category: 'activity',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: 'List of clan members with donations.',
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
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		if (data.members < 1) return message.util.send(`**${data.name}** does not have any clan members...`);

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);

		let [ds, rs] = [5, 5];

		const _sorted = this.sort_received(data.memberList);
		if (_sorted[0].donationsReceived > 99999) rs = 6;
		if (_sorted[0].donationsReceived > 999999) rs = 7;

		const sorted = this.sort_donations(data.memberList);
		if (sorted[0].donations > 99999) ds = 6;
		if (sorted[0].donations > 999999) ds = 7;

		const header = `**\`#  ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'.padEnd(17, ' ')}\`**`;
		const pages = [
			this.paginate(sorted[0], 0, 25)
				.items.map((member, index) => {
					const donation = `${this.donation(member.donations, ds)} ${this.donation(member.donationsReceived, rs)}`;
					return `\`\u200e${(index + 1).toString().padStart(2, '0')} ${donation}  ${this.padEnd(member.name.substring(0, 12))}\``;
				}),
			this.paginate(sorted[0], 25, 50)
				.items.map((member, index) => {
					const donation = `${this.donation(member.donations, ds)} ${this.donation(member.donationsReceived, rs)}`;
					return `\`\u200e${(index + 26).toString().padStart(2, '0')} ${donation}  ${this.padEnd(member.name.substring(0, 12))}\``;
				})
		];

		if (!pages[1].length) {
			return message.util.send({
				embed: embed.setDescription([
					header,
					pages[0].join('\n')
				]).setFooter(`Page 1/1 (${data.members}/50)`)
			});
		}

		const msg = await message.channel.send({
			embed: embed.setDescription([
				header,
				pages[0].join('\n')
			]).setFooter(`Page 1/2 (${data.members}/50)`)
		});

		await msg.react('➕');
		const collector = await msg.awaitReactions(
			(reaction, user) => reaction.emoji.name === '➕' && user.id === message.author.id,
			{ max: 1, time: 30000, errors: ['time'] }
		).catch(() => null);
		if (!msg.deleted) await msg.reactions.removeAll().catch(() => null);
		if (!collector || !collector.size) return;

		return message.channel.send({
			embed: embed.setDescription([header, pages[1].join('\n')])
				.setFooter(`Page 2/2 (${data.members}/50)`)
		});
	}

	ratio(a, b) {
		for (let num = b; num > 1; num--) {
			if ((a % num) === 0 && (b % num) === 0) {
				a /= num;
				b /= num;
			}
		}
		return `${a}:${b}`;
	}

	sort(items) {
		return [items.sort((a, b) => b.donations - a.donations), items.sort((a, b) => b.donationsReceived - a.donationsReceived)];
	}

	padEnd(data) {
		return Util.escapeInlineCode(data).padEnd(16, ' ');
	}

	donation(data, space) {
		return data.toString().padStart(space, ' ');
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}
}

module.exports = DonationBoardCommand;
