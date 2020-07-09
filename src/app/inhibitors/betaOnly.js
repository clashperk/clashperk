const { Inhibitor } = require('discord-akairo');

class BetaInhibitor extends Inhibitor {
	constructor() {
		super('beta', {
			reason: 'beta'
		});
	}

	exec(message, command) {
		if (this.client.isOwner(message.author.id)) return false;
		if (command.categoryID !== 'beta') return false;
		const restrict = this.client.settings.get('global', 'betaUsers', []);
		return !restrict.includes(message.author.id);
	}
}

module.exports = BetaInhibitor;
