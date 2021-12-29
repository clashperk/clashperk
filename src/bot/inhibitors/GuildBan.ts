import { Settings } from '../util/Constants';
import { Inhibitor } from 'discord-akairo';
import { Message } from 'discord.js';

export default class GuildBanInhibitor extends Inhibitor {
	public constructor() {
		super('guild-blacklist', {
			reason: 'guild-blacklist'
		});
	}

	public exec(message: Message) {
		if (this.client.isOwner(message.author.id)) return false;
		if (!message.guild) return false;
		const blacklist = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
		return blacklist.includes(message.guild.id);
	}
}
