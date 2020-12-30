import { Inhibitor, Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class BetaInhibitor extends Inhibitor {
	public constructor() {
		super('beta', {
			reason: 'beta'
		});
	}

	public exec(message: Message, command: Command) {
		if (this.client.isOwner(message.author.id)) return false;
		if (command.categoryID !== 'beta') return false;
		const restrict = this.client.settings.get<string[]>('global', 'betaUsers', []);
		return !restrict.includes(message.author.id);
	}
}
