const { Command } = require('discord-akairo');

class LinkCommand extends Command {
	constructor() {
		super('link', {
			aliases: ['link'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: [
					'Links a clan or player to your account.',
					'',
					'**Available Methods**',
					'• clan `<clanTag>`',
					'• player `<playerTag>`',
					'',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <...args>',
				examples: ['clan #8QU8J9LP', 'player #9Q92C8R20']
			},
			flags: ['clan', 'player', 'profile']
		});
	}

	*args() {
		const flag_ = yield {
			match: 'flag',
			flag: 'clan'
		};

		const flag = yield {
			match: 'flag',
			flag: ['player', 'profile']
		};

		const rest = yield {
			match: 'rest',
			type: 'string',
			default: ''
		};

		return { flag_, flag, rest };
	}

	exec(message, { flag, rest }) {
		if (flag) {
			const command = this.handler.modules.get('link-player');
			return this.handler.handleDirectCommand(message, rest, command, true);
		}

		const command = this.handler.modules.get('link-clan');
		return this.handler.handleDirectCommand(message, rest, command, true);
	}
}

module.exports = LinkCommand;
