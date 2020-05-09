const { Command } = require('discord-akairo');
const FACTS = require('./clashfacts');

class FactsCommand extends Command {
	constructor() {
		super('facts', {
			aliases: ['facts', 'fact'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Displays random Clash of Clans facts.'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	exec(message) {
		const embed = FACTS[Math.floor(Math.random() * FACTS.length)];
		return message.util.send({ embed });
	}
}

module.exports = FactsCommand;
