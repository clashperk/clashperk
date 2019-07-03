const { Command } = require('discord-akairo');

class DonateCommand extends Command {
	constructor() {
		super('donate', {
			aliases: ['donate', 'patreon'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Gives you the link to support/doante for ClashPerk.'
			}
		});
	}

	exec(message) {
		return message.util.send([
			'**Help me to keep this bot alive. Support ClashPerk on patreon**',
			'https://www.patreon.com/suvajit'
		]);
	}
}

module.exports = DonateCommand;
