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
				content: [
					'Creates a beautiful embed for a clan.',
					'',
					'**Become a Patron to make this Embed Live!**',
					'• Self-updaing embed',
					'• Set custom description',
					'• Set accepted town-halls',
					'• Set custom clan leader',
					'• Set custom embed color',
					'',
					'[Become a Patron](https://www.patreon.com/join/clashperk)'
				]
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
