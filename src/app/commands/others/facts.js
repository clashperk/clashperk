const { Command } = require('discord-akairo');
const FACTS = require('../../util/clashfacts');

class FactsCommand extends Command {
	constructor() {
		super('facts', {
			aliases: ['facts', 'fact'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows random clash of clans facts.'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	exec(message) {
		const embed = this.client.util.embed(FACTS[Math.floor(Math.random() * FACTS.length)])
			.setColor(this.client.embed(message))
			.setTimestamp();
		return message.util.send({ embed });
	}
}

module.exports = FactsCommand;
