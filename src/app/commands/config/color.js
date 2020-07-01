const { Command } = require('discord-akairo');

class ColorCommand extends Command {
	constructor() {
		super('color', {
			aliases: ['color'],
			category: 'config',
			ownerOnly: true,
			cooldown: 1000,
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			quoted: false,
			description: {
				content: 'Sets display color of the guild.',
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
