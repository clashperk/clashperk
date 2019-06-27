const { Command, Flag } = require('discord-akairo');

class MembersCommand extends Command {
	constructor() {
		super('members', {
			aliases: ['members'],
			category: 'lookup',
			description: {
				content: 'Displays a list of clan members.',
				usage: '<tag>'
			},
			args: [
				{
					id: 'type',
					match: 'flag',
					flag: ['--th', '-th', 'th']
				},
				{
					id: 'name',
					match: 'rest'
				}
			]
		});
	}

	exec(message, { name, type }) {
		const command = {
			true: this.handler.modules.get('members-th'),
			false: this.handler.modules.get('members-league')
		}[type];
		return this.handler.handleDirectCommand(message, name, command, true);
	}
}

module.exports = MembersCommand;
