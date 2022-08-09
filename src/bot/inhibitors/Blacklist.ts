import { Interaction } from 'discord.js';
import { Inhibitor } from '../lib/index.js';
import { Settings } from '../util/Constants.js';

export default class BlacklistInhibitor extends Inhibitor {
	public constructor() {
		super('blacklist', {
			reason: 'blacklist',
			priority: 1
		});
	}

	public exec(interaction: Interaction) {
		if (this.client.isOwner(interaction.user.id)) return false;
		const blacklist = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
		return blacklist.includes(interaction.user.id);
	}
}
