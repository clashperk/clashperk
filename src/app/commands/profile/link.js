const { Command } = require('discord-akairo');

class LinkCommand extends Command {
	constructor() {
		super('link', {
			aliases: ['link'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: [
					'Links a clan or player to your account.'
				],
				usage: '<tag> [@user]',
				examples: ['#8QU8J9LP', '#9Q92C8R20 @Suvajit']
			},
			flags: ['clan', 'player']
		});
	}

	*args() {
		const flag1 = yield {
			match: 'flag',
			flag: 'clan'
		};

		const flag2 = yield {
			match: 'flag',
			flag: 'player'
		};

		const tag = yield {
			match: 'phrase',
			type: (msg, tag) => tag ? `#${tag.replace(/#/g, '')}` : null
		};

		const rest = yield {
			match: 'rest',
			type: 'string',
			default: ''
		};

		return { flag1, flag2, rest, tag };
	}

	async exec(message, { flag1, flag2, rest, tag }) {
		const command1 = this.handler.modules.get('link-clan');
		const command2 = this.handler.modules.get('link-player');
		if (flag1) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command1, true);
		} else if (flag2) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command2, true);
		}

		const tags = await Promise.all([
			this.client.coc.clan(tag).catch(() => ({ ok: false })),
			this.client.coc.player(tag).catch(() => ({ ok: false }))
		]);

		const num = {
			1: '1️⃣',
			2: '2️⃣',
			3: '❌'
		};

		const types = {
			1: 'Clan',
			2: 'Player'
		};

		if (tags.every(a => a.ok)) {
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor('Select a Player or Clan')
				.setDescription([
					...tags.map((a, i) => `**${types[i + 1]}**\n${num[i + 1]} ${a.name} (${a.tag})\n`)
				]);
			const msg = await message.util.send({ embed });

			for (const emoji of [...Object.values(num)]) {
				await msg.react(emoji);
				await this.delay(250);
			}

			const collector = msg.createReactionCollector(
				(reaction, user) => [...Object.values(num)].includes(reaction.emoji.name) && user.id === message.author.id,
				{ time: 45000, max: 1 }
			);

			collector.on('collect', async reaction => {
				if (reaction.emoji.name === num[1]) {
					return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command1, true);
				}

				if (reaction.emoji.name === num[2]) {
					return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command2, true);
				}

				if (reaction.emoji.name === num[3]) {
					return message.util.send({ embed: { author: { name: 'Command has been cancelled.' } } });
				}
			});

			collector.on('end', () => msg.reactions.removeAll().catch(() => null));
		} else if (tags[0].ok) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command1, true);
		} else if (tags[1].ok) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command2, true);
		} else {
			return message.util.send({
				embed: {
					description: 'I tried to searching your tag as a clan and player but couldn\'t find a match.'
				}
			});
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}
}

module.exports = LinkCommand;
