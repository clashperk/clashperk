import { Collections } from '@clashperk/node';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class LinkAliasCommand extends Command {
	public constructor() {
		super('link-alias', {
			category: '_hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {},
			optionFlags: ['--tag', '--name'],
			flags: ['--remove']
		});
	}

	public *args(msg: Message): unknown {
		const name = yield {
			type: 'lowercase',
			flag: '--name',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		const tag = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => tag ? this.parseTag(tag) : null
		};

		const remove = yield {
			match: 'flag',
			flag: '--remove'
		};

		return { tag, name, remove };
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null;
	}

	public async exec(message: Message, { tag, name: alias, remove }: { tag: string; name: string; remove: boolean }) {
		if (alias && remove) {
			const deleted = await this.client.db.collection(Collections.CLAN_STORES)
				.updateOne({ guild: message.guild!.id, alias }, { $unset: { alias: '' } });
			if (!deleted.matchedCount) return;
			return message.util!.send(`_Successfully deleted **${alias}**_`);
		}

		if (!tag || !alias) {
			const clans = await this.client.db.collection(Collections.CLAN_STORES)
				.find({ guild: message.guild!.id, alias: { $exists: true } })
				.toArray();

			return message.util!.send([
				`**${message.guild!.name} Clan Aliases**`,
				'',
				clans.map(clan => `• **${clan.name as string} (${clan.tag as string})**\n\u2002 **Alias:** ${clan.alias as string}`).join('\n\n')
			]);
		}

		const clan = await this.client.db.collection(Collections.CLAN_STORES)
			.findOne({ guild: message.guild!.id, alias });
		if (clan) {
			return message.util!.send(`_An alias with the name **${alias}** already exists!_`);
		}

		const updated = await this.client.db.collection(Collections.CLAN_STORES)
			.updateOne({ guild: message.guild!.id, tag }, { $set: { alias } });
		if (!updated.matchedCount) {
			return message.util!.send('*The clan must be linked to the server to create an alias.*');
		}

		return message.util!.send(`_Successfully created an alias with the name **${alias}**_`);
	}
}
