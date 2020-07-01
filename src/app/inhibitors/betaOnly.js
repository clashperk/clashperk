const { Inhibitor } = require('discord-akairo');

class BetaInhibitor extends Inhibitor {
	constructor() {
		super('beta', {
			reason: 'beta'
		});
	}

	exec(message) {
		if (this.client.isOwner(message.author.id)) return false;
		if (message.util.parsed && message.util.parsed.command && message.util.parsed.command.categoryID !== 'beta') return false;
		const restrict = this.client.settings.get('global', 'betaUsers', []);
		return !restrict.includes(message.author.id);
	}
}

module.exports = BetaInhibitor;
