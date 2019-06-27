const { Command } = require('discord-akairo');

class DonateCommand extends Command {
	constructor() {
		super('donate', {
			aliases: ['donate', 'patreon'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Gives you the link to support/doante for ClashPerks.'
			}
		});
	}

	exec(message) {
		return message.util.send([
			'**Help me to keep this bot alive. Support ClashPerks on patreon**',
			'https://www.patreon.com/suvajit'
		]);
	}
}

module.exports = DonateCommand;
