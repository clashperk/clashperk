const { Inhibitor } = require('discord-akairo');

class BetaInhibitor extends Inhibitor {
	constructor() {
		super('bzlm', {
			reason: 'bzlm'
		});
	}

	exec(message, command) {
		if (!['set-events', 'sync'].includes(command.id)) return false;
		if (message.guild.id !== '500004711005683717') return false;
		if (message.guild.id === '500004711005683717' && message.channel.id !== '599154177028915225') return message.author.id;
	}
}

module.exports = BetaInhibitor;
