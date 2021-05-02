import { Command, Flag, PrefixSupplier } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';

export default class Export extends Command {
	public constructor() {
		super('export', {
			aliases: ['export'],
			category: 'activity',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: [
					'Export war or season stats to excel for all clans.',
					'',
					'• **Missed Attacks**',
					'• `MISSED [NUMBER]`',
					'',
					'• **Season Stats**',
					'• `SEASON [SEASON_ID]`',
					'',
					'• **Export War Stats**',
					'• `WARS [NUMBER]`',
					'',
					'• **Export Clan Stats**',
					'• `CLANS`',
					'',
					'• **Export Clan Members (Patron Only)**',
					'• `MEMBERS`',
					'',
					'- Season ID must be under 3 months old and must follow `YYYY-MM` format.',
					'',
					'**[Support us on Patreon](https://patreon.com/clashperk)**'
				],
				usage: '<wars|missed|season|clans> [number|season]',
				examples: ['wars', 'clans', 'missed', 'season', 'wars 10', 'missed 10', 'season 2021-01']
			},
			optionFlags: ['--option']
		});
	}

	public *args(msg: Message): unknown {
		const sub = yield {
			flag: '--option',
			type: [
				['export-missed', 'missed'],
				['export-season', 'season'],
				['export-wars', 'war', 'wars'],
				['export-clans', 'clan', 'clans'],
				['export-members', 'member', 'members']
			],
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			otherwise: (msg: Message) => this.handler.runCommand(msg, this, {})
		};

		return Flag.continue(sub);
	}

	public exec(message: Message) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setDescription([
				`\`${prefix}export ${this.description.usage as string}\``,
				'',
				this.description.content.join('\n'),
				'',
				'**Examples**',
				this.description.examples.map((en: string) => `\`${prefix}export ${en}\``).join('\n')
			]);

		return message.util!.send({ embed });
	}
}
