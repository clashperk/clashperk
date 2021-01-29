import { Command, PrefixSupplier } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';

export default class LinkCommand extends Command {
	public constructor() {
		super('link', {
			aliases: ['link'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: [
					'Links Player or Clan to a Discord User or Channel.',
					'',
					'• __**Link Player Tag**__',
					'• `link #PLAYER_TAG` (Self)',
					'',
					'• **Set default account**',
					'• `link #PLAYER_TAG --default`',
					'',
					'• **On behalf of the @USER**',
					'• `link PLAYER_TAG @USER`',
					'',
					'• __**Link Clan Tag**__',
					'• `link #CLAN_TAG` (Self)',
					'',
					'• **On behalf of the @USER**',
					'• `link #CLAN_TAG @USER`',
					'',
					'• **Link to a channel (Admin Only)**',
					'• `link #CLAN_TAG #CHANNEL`'
				],
				usage: '<#tag> [@user|#channel] [--default]',
				examples: [
					'#8QU8J9LP',
					'#9Q92C8R20 @Suvajit',
					'#9Q92C8R20 --default',
					'#8QU8J9LP #channel'
				]
			}
		});
	}

	public *args() {
		const tag = yield {
			type: (msg: Message, tag: string) => this.parseTag(tag)
		};

		const rest = yield {
			'match': 'rest',
			'type': 'string',
			'default': ''
		};

		return { tag, rest };
	}

	public async exec(message: Message, { tag, rest }: { tag: string; rest: string }) {
		if (!tag) {
			const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setDescription([
					`\`${prefix}link ${this.description.usage as string}\``,
					'',
					this.description.content.join('\n'),
					'',
					'**Examples**',
					this.description.examples.map((en: string) => `\`${prefix}link ${en}\``).join('\n')
				]);

			return message.util!.send(
				'**You must provide a valid argument to run this command. Check examples and usage below.**',
				{ embed }
			);
		}

		const clanCommand = this.handler.modules.get('link-clan')!;
		const playerCommand = this.handler.modules.get('link-player')!;

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
					return this.handler.handleDirectCommand(message, `${tag} ${rest}`, clanCommand, true);
				}

				if (reaction.emoji.name === num[2]) {
					return this.handler.handleDirectCommand(message, `${tag} ${rest}`, playerCommand, true);
				}

				if (reaction.emoji.name === num[3]) {
					return message.util!.send({ embed: { author: { name: 'Command has been cancelled.' } } });
				}
			});

			collector.on('end', () => msg.reactions.removeAll().catch(() => null));
		} else if (tags[0].ok) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, clanCommand, true);
		} else if (tags[1].ok) {
			return this.handler.handleDirectCommand(message, `${tag} ${rest}`, playerCommand, true);
		} else {
			return message.util!.send('**I tried to search the tag as a clan and player but couldn\'t find a match.**');
		}
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null;
	}
}
