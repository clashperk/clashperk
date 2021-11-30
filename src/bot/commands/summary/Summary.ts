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
					'• `CLAN`',
					'',
					'• **Top Donations**',
					'• `DONATION`'
				],
				usage: '[war|clan|game|don]',
				examples: ['war', 'clan', 'game', 'don']
			},
			optionFlags: ['--option']
		});
	}

	public *args(msg: Message): unknown {
		const sub = yield {
			flag: '--option',
			match: msg.interaction ? 'option' : 'phrase',
			type: [
				['war-summary', 'war', 'wars'],
				['clan-summary', 'clan', 'clans'],
				['trophy-summary', 'trophy', 'trophies'],
				['donation-summary', 'don', 'donation', 'donations'],
				['clan-games-summary', 'game', 'games', 'score', 'scores'],
				['player-donation-summary', 'player-donations', 'playerdon', 'pd']
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
			].join('\n'));

		return message.util!.send({ embeds: [embed] });
	}
}
