const { Command } = require('discord-akairo');

class AddPatronCommand extends Command {
	constructor() {
		super('addpatron', {
			aliases: ['addpatron'],
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
			type: ['user', 'guild']
		};

		const data = yield {
			type: (msg, id) => {
				if (!id) return null;
				const resolver = this.handler.resolver.type({
					user: 'user',
					guild: 'guild'
				}[type]);
				return resolver(msg, id);
			},
			prompt: {
				start: 'what is the ID of user or guild?',
				retry: 'please provide a valid user ID or guild ID.'
			}
		};

		const limit = yield (
			// eslint-disable-next-line multiline-ternary
			type === 'guild' ? {
				type: 'number',
				prompt: {
					start: 'what is the limit for this guild?'
				}
			} : {
				match: 'none'
			}
		);

		return { type, data, limit };
	}

	async exec(message, { }) { }
}

module.exports = AddPatronCommand;
