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
			if (message.guild && message.channel.permissionsFor(message.channel.guild.me).has(['SEND_MESSAGES'], false)) {
				return message.channel.send(`**Current prefix for this guild is \`${this.client.commandHandler.prefix(message)}\`\u200b**`);
			} else if (message.channel.type === 'dm') {
				return message.channel.send(`**My prefix is \`${this.client.commandHandler.prefix(message)}\`\u200b**`);
			}
		}
	}
}

module.exports = MessageListener;
