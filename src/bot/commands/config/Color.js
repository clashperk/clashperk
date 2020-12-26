const { Command, Argument } = require('discord-akairo');

class ColorCommand extends Command {
	constructor() {
		super('color', {
			aliases: ['color', 'colour'],
			category: 'config',
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
					id: 'color',
					type: Argument.union(['none', 'reset'], 'color'),
					default: message => this.client.embed(message)
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { color }) {
		if (!this.client.patron.check(message.author, message.guild)) {
			return this.handler.handleDirectCommand(message, 'color', this.handler.modules.get('help'), false);
		}

		if (color === 'reset') {
			this.client.settings.delete(message.guild, 'color');
			color = this.client.embed(message);
		}

		this.client.settings.set(message.guild, 'color', color);
		return message.util.send({
			embed: { description: 'Display color updated.', color }
		});
	}
}

module.exports = ColorCommand;
