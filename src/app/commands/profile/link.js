const { Command } = require('discord-akairo');

class LinkCommand extends Command {
	constructor() {
		super('link', {
			aliases: ['link'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: 'Links a clan or player to your Discord.',
				usage: '<method> <...args>',
				examples: ['clan #8QU8J9LP', 'player #9Q92C8R20']
			}
		});
	}

	*args() {
		const method = yield {
			type: [
				['clan'],
				['player', 'profile']
			],
			default: 'clan'
		};

		const rest = yield {
			match: 'rest',
			type: 'string'
		};

		return { method, rest };
	}

	exec(message, { method, rest }) {
		const command = {
			clan: this.handler.modules.get('link-clan'),
			player: this.handler.modules.get('link-player')
		}[method];

		return this.handler.handleDirectCommand(message, rest, command, false);
	}
}

module.exports = LinkCommand;
