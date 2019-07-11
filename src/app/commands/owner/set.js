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
			type: ['log', 'beta']
		};
		const data = yield {
			type: (msg, id) => {
				if (!id) return null;
				const resolver = this.handler.resolver.type({
					log: 'textChannel',
					beta: 'user'
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

		if (type === 'beta') {
			const beta = this.client.settings.get('global', 'beta', []);
			if (beta.includes(data.id)) {
				const index = beta.indexOf(data.id);
				beta.splice(index, 1);
				if (beta.length === 0) this.client.settings.delete('global', 'beta');
				else this.client.settings.set('global', 'beta', beta);

				return message.util.send(`${data.tag}, has been removed from beta.`);
			}

			beta.push(data.id);
			this.client.settings.set('global', 'beta', beta);

			return message.util.send(`${data.tag}, has been add to beta.`);
		}

		return message.util.reply({
			log: `client log channel set to ${data}`,
			beta: `added new beta user **${data.tag}**`
		}[type]);
	}
}

module.exports = SetCommand;
