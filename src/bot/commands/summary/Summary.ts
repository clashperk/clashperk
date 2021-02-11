import { Command, Flag } from 'discord-akairo';

export default class SummaryCommand extends Command {
	public constructor() {
		super('summary', {
			aliases: ['summary'],
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Summary for all clans',
				usage: '[key]',
				examples: ['']
			}
		});
	}

	public *args() {
		const sub = yield {
			type: [
				['summary-clan', 'clans', 'clan'],
				['summary-wars', 'wars', 'war'],
				['summary-games', 'game', 'games', 'score', 'cg']
			]
		};

		return Flag.continue(sub);
	}
}
