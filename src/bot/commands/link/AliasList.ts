import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { Util } from '../../util/Util';

export default class AliasListCommand extends Command {
	public constructor() {
		super('alias-list', {
			aliases: ['aliases'],
			category: 'none',
			channel: 'guild',
			description: {}
		});
	}

	public async exec(message: Message) {
		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id, alias: { $exists: true } })
			.toArray();

		const chunks = Util.splitMessage([
			`**${message.guild!.name} Clan Aliases**`,
			'',
			clans.map(clan => `• **${clan.name as string} (${clan.tag as string})**\n\u2002 **Alias:** ${clan.alias as string}`).join('\n\n')
		].join('\n'));

		for (const chunk of chunks) await message.util!.send(chunk);
	}
}
