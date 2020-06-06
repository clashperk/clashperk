const { Command } = require('discord-akairo');

class ClanEmbedCommand extends Command {
	constructor() {
		super('clanembed', {
			aliases: ['clanembed', 'cembed'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				usage: '<clanTag> [--color]',
				examples: ['#8QU8J9LP --color #5970C1'],
				content: 'Setup a live updating clan embed.'
			},
			args: [
				{
					id: 'args',
					match: 'content',
					default: ''
				}
			]
		});
	}

	async exec(message, { args }) {
		const patron = this.client.patron.get(message.guild.id, 'guild', false);
		if (patron) {
			return this.handler.handleDirectCommand(message, args, this.handler.modules.get('patron-clanembed'), false);
		}

		return this.handler.handleDirectCommand(message, args, this.handler.modules.get('simple-clanembed'), false);
	}
}

module.exports = ClanEmbedCommand;
