import { Command, Argument } from 'discord-akairo';
import { Message } from 'discord.js';

export default class ColorCommand extends Command {
	public constructor() {
		super('config-color', {
			aliases: ['color', 'colour'],
			category: '_hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			quoted: false,
			description: {
				content: [
					'Sets display color of the server.',
					'',
					'**Patron only Feature**',
					'',
					'[Become a Patron](https://www.patreon.com/clashperk)'
				],
				usage: '<color>',
				examples: ['#0080ff', 'none', 'reset']
			},
			args: [
				{
					'id': 'color',
					'type': Argument.union(['none', 'reset'], 'color'),
					'default': (message: Message) => this.client.embed(message)
				}
			]
		});
	}

	public async exec(message: Message, { color }: { color: number | string }) {
		if (!this.client.patrons.get(message.guild!.id)) {
			return this.handler.handleDirectCommand(message, 'color', this.handler.modules.get('help')!, false);
		}

		if (color === 'reset') {
			this.client.settings.delete(message.guild!, 'color');
			color = this.client.embed(message);
		}

		this.client.settings.set(message.guild!, 'color', color);
		return message.util!.send({
			embed: { description: 'Display color updated.', color }
		});
	}
}
