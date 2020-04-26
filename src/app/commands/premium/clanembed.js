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
			optionFlags: ['--accepts']
		});
	}

	*args() {
		const clan = yield {
			type: 'clan',
			prompt: {
				start: 'What is the clan tag?',
				retry: 'Please provide a valid clan tag.'
			}
		};

		const accepts = yield {
			type: 'string',
			match: 'option',
			flag: ['--accepts']
		};

		return { clan, accepts };
	}

	async exec(message, { clan, accepts }) {
		return message.util.send(`${clan} | ${accepts}`);
	}
}

module.exports = ClanEmbedCommand;
