import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class LinkCommand extends Command {
	public constructor() {
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
			flags: ['clan', 'player', 'timezone', 'offset']
		});
	}

	public *args() {
		const flag1 = yield {
			match: 'flag',
			flag: 'clan'
		};

		const flag2 = yield {
			match: 'flag',
			flag: 'player'
		};

		const offset = yield {
			match: 'flag',
			flag: ['timezone', 'offset']
		};

		const tag = yield {
			match: offset ? 'none' : 'phrase',
			type: (msg: Message, tag: string) => tag ? `#${tag.replace(/#/g, '')}` : null
		};

		const rest = yield {
			'match': 'rest',
			'type': 'string',
			'default': ''
		};

		return { flag1, flag2, rest, tag, offset };
	}

	public async exec(message: Message, { flag1, flag2, rest, tag, offset }: { flag1: boolean; flag2: boolean; rest: string; tag: string; offset: boolean }) {
		const command1 = this.handler.modules.get('link-clan')!;
		const command2 = this.handler.modules.get('link-player')!;
		const command3 = this.handler.modules.get('time-offset')!;

		if (flag1) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command1, true);
		} else if (flag2) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command2, true);
		} else if (offset) {
			return this.handler.handleDirectCommand(message, `${rest}`, command3, true);
		}

		if (!tag) {
			return message.util!.send({
				embed: {
					description: 'Provide a correct clan tag or player tag!'
				}
			});
		}

		const tags = await Promise.all([this.client.http.clan(tag), this.client.http.player(tag)]);

		const num: { [key: string]: string } = {
			1: '1️⃣',
			2: '2️⃣',
			3: '❌'
		};

		const types: { [key: string]: string } = {
			1: 'Clan',
			2: 'Player'
		};

		if (tags.every(a => a.ok)) {
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor('Select a Player or Clan')
				.setDescription([
					...tags.map((a, i) => `**${types[i + 1]}**\n${num[i + 1]} ${a.name as string} (${a.tag as string})\n`)
				]);
			const msg = await message.util!.send({ embed });

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
					return message.util!.send({ embed: { author: { name: 'Command has been cancelled.' } } });
				}
			});

			collector.on('end', () => msg.reactions.removeAll().catch(() => null));
		} else if (tags[0].ok) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command1, true);
		} else if (tags[1].ok) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, command2, true);
		} else {
			return message.util!.send({
				embed: {
					description: 'I tried to search your tag as a clan and player but couldn\'t find a match.'
				}
			});
		}
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}
}
