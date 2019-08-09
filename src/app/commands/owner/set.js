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
			type: ['log', 'beta', 'limit']
		};
		const data = yield {
			type: (msg, id) => {
				if (!id) return null;
				const resolver = this.handler.resolver.type({
					log: 'string',
					beta: 'user',
					limit: 'guild'
				}[type]);
				return resolver(msg, id);
			}
		};
		const num = yield {
			type: 'number',
			default: 10
		};

		return { type, data, num };
	}

	exec(message, { type, data, num }) {
		if (!type || !data) return;

		if (type === 'log') {
			const webhook = this.client.fetchWebhook(data).catch(() => null);
			if (!webhook) return;
			this.client.settings.set('global', 'webhook', webhook.id);
			return message.util.reply(`client webhook set to ${webhook.name}`);
		}

		if (type === 'beta') {
			const beta = this.client.settings.get('global', 'beta', []);
			if (beta.includes(data.id)) {
				const index = beta.indexOf(data.id);
				beta.splice(index, 1);
				if (beta.length === 0) this.client.settings.delete('global', 'beta');
				else this.client.settings.set('global', 'beta', beta);

				return message.util.send(`${data.tag} has been removed from beta.`);
			}

			beta.push(data.id);
			this.client.settings.set('global', 'beta', beta);

			return message.util.send(`${data.tag} has been add to beta.`);
		}

		if (type === 'limit') {
			if (!data) return message.util.send('**Invalid Guild**');
			this.client.settings.set(data, 'clanLimit', num);
			return message.util.send(`Clan limit set to **${num}** for **${data.name}**`);
		}
	}
}

module.exports = SetCommand;
