import { Command, Flag } from 'discord-akairo';

export default class SetupEnableCommand extends Command {
	public constructor() {
		super('setup-enable', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Enable features or assign clans to channels.'
				],
				usage: '[option] [#clanTag] [#channel] [color] [role]',
				examples: []
			},
			optionFlags: ['--option']
		});
	}

	public *args(): unknown {
		const method = yield {
			type: [
				['setup-channel-link', 'channel-link'],
				['setup-clan-embed', 'clan-embed'],
				['setup-server-link', 'server-link'],
				['setup-last-seen', 'lastseen'],
				['setup-clan-feed', 'clan-feed'],
				['setup-donations', 'donation-log'],
				['setup-clan-games', 'clan-games'],
				['setup-clan-wars', 'war-feed']
			],
			flag: ['--option'],
			match: 'option'
		};

		return Flag.continue(method);
	}
}
