const { Command } = require('discord-akairo');

class RedeemCommand extends Command {
	constructor() {
		super('redeem', {
			aliases: ['redeem'],
			category: 'util',
			cooldown: 1000,
			description: {
				content: 'Redeems premium subscription.'
			}
		});
	}

	async exec(message) {

	}
}

module.exports = RedeemCommand;
