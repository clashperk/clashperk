const { Command } = require('discord-akairo');

class ClanEmbedCommand extends Command {
	constructor() {
		super('clanembed', {
			aliases: ['clanembed'],
			category: 'owner',
			cooldown: 3000,
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Creates a live updating clan embed.',
				usage: '<tag> [--accepts] [11 12 13]'
			},
			flags: ['--accepts']
		});
	}

	*args() {
		const clan = yield {
			type: 'string',
			prompt: {
				start: 'What is the clan tag?',
				retry: 'Please provide a valid clan tag.'
			}
		};

		const flag = yield {
			match: 'flag',
			flag: ['--th', '-th', 'th']
		};

		const accepts = yield (
			// eslint-disable-next-line multiline-ternary
			flag ? {
				match: 'rest',
				type: 'string'
			} : {
				match: 'rest',
				type: 'string'
			}
		);

		return { clan, flag, accepts };
	}

	async exec(message, { clan, accepts }) {
		return message.util.send(`${clan} | ${accepts}`);
	}
}

module.exports = ClanEmbedCommand;
