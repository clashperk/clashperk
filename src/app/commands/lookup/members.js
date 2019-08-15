const { Command, Flag } = require('discord-akairo');

class MembersCommand extends Command {
	constructor() {
		super('members', {
			aliases: ['members'],
			category: 'lookup',
			cooldown: 0,
			description: {
				content: 'List of clan members (--th to view th levels).',
				usage: '<tag> [th] [th level]',
				examples: [
					'#8QU8J9LP',
					'#8QU8J9LP th',
					'#8QU8J9LP th 10',
					'#8QU8J9LP th 9'
				]
			},
			args: [
				{
					id: 'type',
					match: 'flag',
					flag: ['--th', '-th', 'th'],
					type: 'string'
				},
				{
					id: 'name',
					match: 'rest',
					default: ''
				}
			]
		});
	}

	exec(message, { name, type }) {
		const command = {
			true: this.handler.modules.get('members-th'),
			false: this.handler.modules.get('members-league')
		}[type];
		return this.handler.handleDirectCommand(message, name, command, false);
	}
}

module.exports = MembersCommand;
