const { Command } = require('discord-akairo');

class ClanEmbedCommand extends Command {
	constructor() {
		super('clanembed', {
			aliases: ['clanembed'],
			category: 'other',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				usage: '<clanTag>',
				examples: ['#8QU8J9LP'],
				content: [
					'Creates a live promotional embed for a clan.'
				],
				image: {
					text: [
						'**Patron only Feature**',
						'',
						'[Become a Patron](https://www.patreon.com/join/clashperk)'
					],
					url: 'https://i.imgur.com/QNeOD2n.png'
				}
			},
			args: [
				{
					id: 'simple',
					match: 'flag',
					flag: ['--simple']
				},
				{
					id: 'args',
					match: 'rest',
					default: ''
				}
			]
		});
	}

	async exec(message, { args, simple }) {
		const patron = this.client.patron.get(message.guild.id, 'guild', false);
		if (patron && !simple) {
			return this.handler.handleDirectCommand(message, args, this.handler.modules.get('patron-clanembed'), false);
		}

		return this.handler.handleDirectCommand(message, args, this.handler.modules.get('simple-clanembed'), false);
	}
}

module.exports = ClanEmbedCommand;
