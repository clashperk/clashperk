import { Collections } from '@clashperk/node';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class AliasListCommand extends Command {
	public constructor() {
		super('alias-list', {
			aliases: ['aliases'],
			category: '_hidden',
			channel: 'guild',
			description: {}
		});
	}

	public async exec(message: Message) {
		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id, alias: { $exists: true } })
			.toArray();

		return message.util!.send({
			split: true,
			content: [
				`**${message.guild!.name} Clan Aliases**`,
				'',
				clans.map(clan => `• **${clan.name as string} (${clan.tag as string})**\n\u2002 **Alias:** ${clan.alias as string}`).join('\n\n')
			].join('\n')
		});
	}
}
