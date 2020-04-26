const { Command, Argument } = require('discord-akairo');

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
			}
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

		const leader = yield {
			type: 'member',
			prompt: {
				start: 'Who is the leader?',
				retry: 'Please mention a valid member...'
			}
		};

		const accepts = yield {
			type: 'string',
			prompt: {
				start: 'What townhalls are accepted?',
				retry: 'Please provide a valid number...'
			}
		};

		const description = yield {
			match: 'rest',
			prompt: {
				start: 'What would you like to set the description?',
				retry: 'Please provide a description...'
			}
		};

		return { clan, leader, accepts, description };
	}

	async exec(message, { clan, accepts, leader, description }) {
		return message.util.send([
			`${clan} | ${accepts.split(',').map(item => item.trim()).join(', ')}`,
			leader.id,
			description
		]);
	}
}

module.exports = ClanEmbedCommand;
