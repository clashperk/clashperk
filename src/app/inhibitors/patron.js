const { Inhibitor } = require('discord-akairo');

class PatronInhibitor extends Inhibitor {
	constructor() {
		super('premium', {
			reason: 'premium'
		});
	}

	exec(message) {
		if (this.client.isOwner(message.author.id)) return false;
		if (message.util.parsed && message.util.parsed.command && message.util.parsed.command.categoryID !== 'premium') return false;
		return !this.client.patron.get(message.guild.id, 'guild', false);
	}
}

module.exports = PatronInhibitor;
