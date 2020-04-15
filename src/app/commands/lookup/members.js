const { Command } = require('discord-akairo');

class MembersCommand extends Command {
	constructor() {
		super('members', {
			aliases: ['members'],
			category: 'lookup',
			description: {
				content: 'List of clan members (--th to view th levels).',
				usage: '<tag> [--th/-th] [th level]',
				examples: [
					'#8QU8J9LP',
					'#8QU8J9LP --th',
					'#8QU8J9LP -th 10',
					'#8QU8J9LP -th 9'
				]
			},
			flags: ['--th', '-th', 'th']
		});
	}

	*args() {
		const flag = yield {
			match: 'flag',
			flag: ['--th', '-th', 'th']
		};

		const args = yield (
			// eslint-disable-next-line multiline-ternary
			flag ? {
				match: 'content',
				type: 'string',
				default: ''
			} : {
				match: 'content',
				type: 'rest',
				default: ''
			}
		);

		return { args, flag };
	}

	exec(message, { args, flag }) {
		if (flag) {
			return this.handler.handleDirectCommand(message, args, this.handler.modules.get('members-th'), false);
		}
		return this.handler.handleDirectCommand(message, args, this.handler.modules.get('members-league'), false);
	}
}

module.exports = MembersCommand;
