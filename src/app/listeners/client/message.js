const { Listener } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class MessageListener extends Listener {
	constructor() {
		super('message', {
			event: 'message',
			emitter: 'client',
			category: 'client'
		});
	}

	async exec(message) {
		const color = this.client.settings.get(message.guild, 'color', null);
		/* eslint-disable func-name-matching */
		Object.defineProperty(MessageEmbed.prototype, 'setColor', {
			value: function setColor(colour) {
				if (!color) this.color = colour;
				else this.color = color;
				return this;
			}
		});

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
