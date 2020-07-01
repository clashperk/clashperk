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
		const method = yield {
			type: ['patron', 'beta'],
			prompt: {
				start: 'What would you like to set?',
				retry: 'Please provide a valid method.'
			}
		};

		const user = yield {
			type: async (msg, id) => {
				if (!id) return null;
				return this.client.users.fetch(id, false).catch(() => null);
			},
			prompt: {
				start: 'What is the userId?',
				retry: 'Please provide a valid userId.'
			}
		};

		return { method, user };
	}

	async exec(message, { method, user }) {
		if (method === 'patron') return;
		if (method === 'beta') {
			const users = this.client.settings.get('global', 'betaUsers', []);
			if (users.includes(user.id)) {
				const index = users.indexOf(user.id);
				users.splice(index, 1);
				if (users.length === 0) this.client.settings.delete('global', 'betaUsers');
				else this.client.settings.set('global', 'betaUsers', users);

				return message.util.send(`${user.tag} has been removed from beta.`);
			}

			users.push(user.id);
			this.client.settings.set('global', 'betaUsers', users);

			return message.util.send(`${user.tag} has been add to beta.`);
		}
	}
}

module.exports = SetCommand;
