const { Inhibitor } = require('discord-akairo');

class PatronInhibitor extends Inhibitor {
	constructor() {
		super('patron', {
			reason: 'patron'
		});
	}

	exec(message, command) {
		if (this.client.isOwner(message.author.id)) return false;
		if (command.categoryID !== 'patron') return false;
		// if (message.util.parsed && message.util.parsed.command && message.util.parsed.command.categoryID !== 'patron') return false;
		return !this.client.patron.get(message.guild.id, 'guild', false);
	}
}

module.exports = PatronInhibitor;
