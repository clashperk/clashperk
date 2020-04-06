const { Command, Flag } = require('discord-akairo');
const fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');
const { Util } = require('discord.js');

class DonationBoardCommand extends Command {
	constructor() {
		super('donationboard', {
			aliases: ['donationboard', 'db'],
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: 'List of clan members with donations.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return fetch.clan(str).then(data => {
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
				return fetch.clan(data.clan).then(data => {
					if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
					return data;
				});
			},
			prompt: {
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};
		return { data };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);

		// const header = `\`#    DON   REC   ${'RATIO'.padStart(8, ' ')}  ${'NAME'.padEnd(20, ' ')}\``;
		const header = `\`#    DON   REC  ${'NAME'.padEnd(20, ' ')}\``;
		const pages = [
			this.paginate(this.sort(data.memberList), 0, 25)
				.items.map((member, index) => {
					const donation = `${this.donation(member.donations)} ${this.donation(member.donationsReceived)}`;
					// const ratio = this.ratio(member.donations, member.donationsReceived).padStart(10, ' ');
					return `\`${(index + 1).toString().padStart(2, '0')} ${donation}  ${this.padEnd(member.name)}\``;
				}),
			this.paginate(this.sort(data.memberList), 25, 50)
				.items.map((member, index) => {
					const donation = `${this.donation(member.donations)} ${this.donation(member.donationsReceived)}`;
					// const ratio = this.ratio(member.donations, member.donationsReceived).padStart(10, ' ');
					return `\`${(index + 26).toString().padStart(2, '0')} ${donation}  ${this.padEnd(member.name)}\``;
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
		return items.sort((a, b) => b.donations - a.donations);
	}

	padEnd(data) {
		return Util.escapeInlineCode(data).padEnd(20, ' ');
	}

	donation(data) {
		return data.toString().padStart(5, ' ');
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}
}

module.exports = DonationBoardCommand;
