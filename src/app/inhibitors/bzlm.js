const { Inhibitor } = require('discord-akairo');

class BetaInhibitor extends Inhibitor {
	constructor() {
		super('bzlm', {
			reason: 'bzlm'
		});
	}

	exec(message, command) {
		if (!['set-events', 'sync'].includes(command.id)) return false;
		if (message.guild.id !== '600794042472595516') return false;
		if (message.guild.id === '600794042472595516' && message.channel.id !== this.client.settings.get(message.guild, 'bzlmSync', undefined)) return message.author.id;
	}
}

module.exports = BetaInhibitor;
