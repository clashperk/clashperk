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
		if (message.mentions.has(this.client.user.id) && /^<@!?(\d+)>$/.test(message) && message.channel.permissionsFor(message.channel.guild.me).has(['SEND_MESSAGES'], false)) {
			return message.channel.send(`**${message.author}, my prefix is \`${this.client.commandHandler.prefix(message)}\`\u200b**`);
		}
	}
}

module.exports = MessageListener;
