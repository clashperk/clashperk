import { Command, Flag, PrefixSupplier } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';

export default class SummaryCommand extends Command {
	public constructor() {
		super('summary', {
			aliases: ['summary'],
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Summary of wars/clans/clan games for all clans.',
					'',
					'• **War Summary**',
					'• `WAR`',
					'',
					'• **Clan Games**',
					'• `GAME`',
					'',
					'• **Clan Summary**',
					'• `CLAN`'
				],
				usage: '[war|clan|game]',
				examples: ['war', 'clan', 'game']
			},
			optionFlags: ['--option']
		});
	}

	public *args(msg: Message): unknown {
		const sub = yield {
			flag: '--option',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: [
				['war-summary', 'war', 'wars'],
				['clan-summary', 'clan', 'clans'],
				['clan-games-summary', 'game', 'games', 'score', 'scores']
			],
			otherwise: (msg: Message) => this.handler.runCommand(msg, this, {})
		};

		return Flag.continue(sub);
	}

	public exec(message: Message) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setDescription([
				`\`${prefix}summary ${this.description.usage as string}\``,
				'',
				this.description.content.join('\n'),
				'',
				'**Examples**',
				this.description.examples.map((en: string) => `\`${prefix}summary ${en}\``).join('\n')
			]);

		return message.util!.send({ embed });
	}
}
