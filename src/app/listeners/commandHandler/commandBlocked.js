const { Listener } = require('discord-akairo');

class CommandBlockedListener extends Listener {
	constructor() {
		super('commandBlocked', {
			event: 'commandBlocked',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	exec(message, command, reason) {
		const text = {
			guild: () => 'you must be in a guild to use this command.',
			restrict: () => 'you can\'t use this command because you have been restricted.'
		}[reason];

		const label = message.guild ? `${message.guild.name}/${message.channel.id}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id} ~ ${reason}`, { label });

		if (!text) return;
		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			return message.reply(text());
		}
	}
}

module.exports = CommandBlockedListener;
