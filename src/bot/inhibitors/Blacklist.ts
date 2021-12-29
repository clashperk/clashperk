import { Inhibitor } from 'discord-akairo';
import { Message } from 'discord.js';
import { Settings } from '../util/Constants';

export default class BlacklistInhibitor extends Inhibitor {
	public constructor() {
		super('blacklist', {
			reason: 'blacklist'
		});
	}

	public exec(message: Message) {
		if (this.client.isOwner(message.author.id)) return false;
		const blacklist = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
		return blacklist.includes(message.author.id);
	}
}
