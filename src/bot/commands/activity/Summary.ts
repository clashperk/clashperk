import { Command, Flag } from 'discord-akairo';

export default class SummaryCommand extends Command {
	public constructor() {
		super('summary', {
			aliases: ['summary'],
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Summary of Wars/Clans/Clan Games for all clans.',
				usage: '[war|clan|game]',
				examples: ['summary war']
			}
		});
	}

	public *args() {
		const sub = yield {
			type: [
				['war-summary', 'war', 'wars'],
				['clan-summary', 'clan', 'clans'],
				['clan-games-summary', 'game', 'games', 'score', 'scores']
			]
		};

		return Flag.continue(sub);
	}
}
