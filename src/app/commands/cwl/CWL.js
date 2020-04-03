const { Command } = require('discord-akairo');

class CWLComamnd extends Command {
	constructor() {
		super('cwl', {
			// aliases: ['cwl'],
			category: 'owner',
			cooldown: 3000,
			description: {
				content: 'You can\'t use it anyway, so why explain?'
			}
		});
	}

	async exec(message) {}
}

// module.exports = CWLComamnd;
