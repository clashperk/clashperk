const { Inhibitor } = require('discord-akairo');

class RestrictInhibitor extends Inhibitor {
	constructor() {
		super('restrict', {
			reason: 'restrict'
		});
	}

	exec(message) {
		if (this.client.isOwner(message.author.id)) return false;
		const categoryID = ['tracker', 'profile', 'config'];
		if (message.util.parsed && message.util.parsed.command && !categoryID.includes(message.util.parsed.command.categoryID)) return false;
		const restrict = this.client.settings.get(message.guild, 'restrict', []);
		return restrict.includes(message.author.id);
	}
}

module.exports = RestrictInhibitor;
