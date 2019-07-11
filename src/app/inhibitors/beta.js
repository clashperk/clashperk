const { Inhibitor } = require('discord-akairo');

class BetaInhibitor extends Inhibitor {
	constructor() {
		super('beta', {
			reason: 'restrict'
		});
	}

	exec(message) {
		if (message.util.parsed && message.util.parsed.command && message.util.parsed.command.categoryID !== 'beta' && this.client.isOwner(message.author.id)) return false;
		const restrict = this.client.settings.get('global', 'beta', []);
		return !restrict.includes(message.author.id);
	}
}

module.exports = BetaInhibitor;
