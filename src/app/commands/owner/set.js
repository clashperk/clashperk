const { Command } = require('discord-akairo');

class SetCommand extends Command {
	constructor() {
		super('set', {
			aliases: ['set'],
			category: 'owner',
			channel: 'guild',
			ownerOnly: true,
			description: {
				content: 'You can\'t use this anyway, so why explain?'
			}
		});
	}

	*args() {
		const type = yield {
			type: ['log', 'owner']
		};
		const data = yield {
			type: (msg, id) => {
				if (!id) return null;
				const resolver = this.handler.resolver.type({
					log: 'textChannel',
					owner: 'user'
				}[type]);
				return resolver(msg, id);
			}
		};

		return { type, data };
	}

	exec(message, { type, data }) {
		if (!type || !data) return;

		if (type === 'log') {
			this.client.settings.set('global', 'clientLog', data.id);
		}

		if (type === 'owner') {
			this.client.settings.set('global', 'owners', data.id);
		}

		return message.util.reply({
			log: `client log channel set to ${data}`,
			owner: `added new owner ${data.tag}`
		}[type]);
	}
}

module.exports = SetCommand;
