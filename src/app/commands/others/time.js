const { Command } = require('discord-akairo');
const moment = require('moment');

class TimeCommand extends Command {
	constructor() {
		super('time', {
			aliases: ['time'],
			category: 'owner',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'nop'
			},
			args: [
				{
					id: 'tz',
					match: 'content'
				}
			]
		});
	}

	exec(message, { tz }) {
		const time = moment.utc();
		const d = time.tz(tz).format('DD-MM-YYY ha z');
		return message.util.send(d);
	}
}

module.exports = TimeCommand;
