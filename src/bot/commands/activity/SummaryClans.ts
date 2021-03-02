import { Command } from 'discord-akairo';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('clan-summary', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {}
		});
	}

	public exec() {
		console.log(0);
	}
}
