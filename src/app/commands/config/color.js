const { Command } = require('discord-akairo');

class ColorCommand extends Command {
	constructor() {
		super('color', {
			aliases: ['color'],
			category: 'config',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			quoted: false,
			description: {
				content: [
					'Sets display color of the guild.',
					'',
					'**Patron only Feature**',
					'',
					'[Become a Patron](https://www.patreon.com/join/clashperk)'
				],
				usage: '<color>',
				examples: ['#0080ff']
			},
			args: [
				{
					id: 'hexColor',
					type: 'color',
					default: message => this.client.embed(message)
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { hexColor }) {
		if (!this.client.patron.check(message.author, message.guild)) {
			return this.handler.handleDirectCommand(message, 'color', this.handler.modules.get('help'), false);
		}
		this.client.settings.set(message.guild, 'color', hexColor);
		return message.util.send({
			embed: {
				description: 'Display color updated.',
				color: hexColor
			}
		});
	}
}

module.exports = ColorCommand;
