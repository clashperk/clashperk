import { Inhibitor } from 'discord-akairo';
import { Message } from 'discord.js';

export default class GuildBanInhibitor extends Inhibitor {
	public constructor() {
		super('guildban', {
			reason: 'guildban'
		});
	}

	public exec(message: Message) {
		if (this.client.isOwner(message.author.id)) return false;
		if (!message.guild) return false;
		const blacklist = this.client.settings.get<string[]>('global', 'guildBans', []);
		return blacklist.includes(message.guild.id);
	}
}
