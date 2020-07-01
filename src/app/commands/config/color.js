const { Command } = require('discord-akairo');

class ColorCommand extends Command {
	constructor() {
		super('color', {
			aliases: ['color'],
			category: 'config',
			cooldown: 3000,
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			quoted: false,
			description: {
				content: [
					'Sets display color of the guild.',
					'',
					'**Patron only Feature**',
					'',
					'[Become a Patron](https://www.patreon.com/clashperk)'
				],
				usage: '<color>',
				examples: ['#0080ff']
			},
			args: [
				{
					id: 'hexColor',
					type: 'color',
					default: null
				}
			]
		});
	}

	async exec(message, { hexColor }) {
		if (!this.client.patron.isPatron(message.author, message.guild)) {
			return this.handler.handleDirectCommand(message, 'color', this.handler.modules.get('color'), false);
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
