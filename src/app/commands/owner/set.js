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
					log: 'string',
					beta: 'user'
				}[type]);
				return resolver(msg, id);
			},
			prompt: {
				start: 'what is the ID of webhook or user?',
				retry: 'please provide a valid webhook ID or user ID.'
			}
		};

		return { type, data };
	}

	async exec(message, { type, data: id, data: user }) {
		if (!type || !id) return;

		if (type === 'log') {
			const webhook = await this.client.fetchWebhook(id).catch(() => null);
			if (!webhook) return;
			this.client.settings.set('global', 'webhook', webhook.id);
			return message.util.reply(`client webhook set to ${webhook.name}`);
		}

		if (type === 'beta') {
			const beta = this.client.settings.get('global', 'beta', []);
			if (beta.includes(user.id)) {
				const index = beta.indexOf(user.id);
				beta.splice(index, 1);
				if (beta.length === 0) this.client.settings.delete('global', 'beta');
				else this.client.settings.set('global', 'beta', beta);

				return message.util.send(`${user.tag} has been removed from beta.`);
			}

			beta.push(user.id);
			this.client.settings.set('global', 'beta', beta);

			return message.util.send(`${user.tag} has been add to beta.`);
		}
	}
}

module.exports = SetCommand;
