import { Command, Flag } from 'discord-akairo';
import { Message } from 'discord.js';

export default class AliasCommand extends Command {
	public constructor() {
		super('alias', {
			aliases: ['alias'],
			category: 'setup',
			channel: 'guild',
			description: {
				content: [
					'Create, Remove or View clan aliases.',
					'',
					'• **Alias Create**',
					'• `alias add NAME #CLAN_TAG`',
					'',
					'• **Alias Remove**',
					'• `alias remove NAME`',
					'• `alias remove #CLAN_TAG`',
					'',
					'• **Alias List**',
					'• `alias list`'
				],
				usage: '<option> [name] [clanTag]',
				examples: [
					'add AH #8QU8J9LP',
					'remove AH',
					'list'
				],
				image: {
					url: 'https://i.imgur.com/8fWqtY5.png',
					text: ''
				}
			}
		});
	}

	public *args(): unknown {
		const sub = yield {
			type: [
				['alias-list', 'list'],
				['alias-add', 'add', 'create'],
				['alias-remove', 'remove', 'delete']
			],
			otherwise: (msg: Message) => this.handler.handleDirectCommand(msg, 'alias', this.handler.modules.get('help')!)
		};

		return Flag.continue(sub);
	}
}
