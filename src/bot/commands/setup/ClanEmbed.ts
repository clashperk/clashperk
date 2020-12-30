import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class ClanEmbedCommand extends Command {
	public constructor() {
		super('setup-clanembed', {
			aliases: ['clanembed'],
			category: 'other',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				usage: '<clanTag>',
				examples: ['#8QU8J9LP'],
				content: [
					'Creates a live promotional embed for a clan.'
				],
				image: {
					text: [
						'**Patron only Feature**',
						'',
						'[Become a Patron](https://www.patreon.com/clashperk)'
					],
					url: 'https://i.imgur.com/txkD6q7.png'
				}
			},
			args: [
				{
					id: 'simple',
					match: 'flag',
					flag: ['--simple']
				},
				{
					'id': 'args',
					'match': 'rest',
					'default': ''
				}
			]
		});
	}

	public async exec(message: Message, { args, simple }: { args: string; simple: boolean }) {
		const patron = this.client.patrons.get(message.guild!.id);
		if (patron && !simple) {
			return this.handler.handleDirectCommand(message, args, this.handler.modules.get('setup-patron-clanembed')!, false);
		}

		return this.handler.handleDirectCommand(message, args, this.handler.modules.get('setup-simple-clanembed')!, false);
	}
}
