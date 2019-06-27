const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');

class CooldownListener extends Listener {
	constructor() {
		super('cooldown', {
			event: 'cooldown',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	exec(message, command, remaining) {
		const time = remaining / 1000;
		const level = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		Logger.log(`=> ${command.id} ~ ${time}`, { level });

		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			return message.reply(`You can use that command again in ${time} seconds.`);
		}
	}
}

module.exports = CooldownListener;
