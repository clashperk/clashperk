const { Command } = require('discord-akairo');

class GuideCommand extends Command {
	constructor() {
		super('guide', {
			aliases: ['guide'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about how to use bot.' }
		});
	}

	async exec(message) {
		return message.util.send('https://clashperk.github.io/');
	}
}

module.exports = GuideCommand;
