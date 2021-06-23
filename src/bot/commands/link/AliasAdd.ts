import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class AliasAddCommand extends Command {
	public constructor() {
		super('alias-add', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			optionFlags: ['--tag', '--name'],
			description: {}
		});
	}

	public *args(msg: Message): unknown {
		const name = yield {
			type: 'lowercase',
			flag: '--name',
			match: msg.interaction ? 'option' : 'phrase'
		};

		const tag = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => tag ? this.parseTag(tag) : null
		};

		return { tag, name };
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null;
	}

	public async exec(message: Message, { tag, name: alias }: { tag: string; name: string }) {
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
