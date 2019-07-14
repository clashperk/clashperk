const { Listener } = require('discord-akairo');

class MessageListener extends Listener {
	constructor() {
		super('message', {
			event: 'message',
			emitter: 'client',
			category: 'client'
		});
	}

	async exec(message) {
		if (message.mentions.has(this.client.user.id) && /^<@!?(\d+)>$/.test(message)) {
			try {
				return message.channel.send(`**Current prefix for this guild is \`${this.client.commandHandler.prefix(message)}\`\u200b**`);
			} catch {}
		}
	}
}

module.exports = MessageListener;
