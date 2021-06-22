import { Collections } from '@clashperk/node';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class AliasRemoveCommand extends Command {
	public constructor() {
		super('alias-remove', {
			category: '_hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			optionFlags: ['--name'],
			description: {}
		});
	}

	public *args(msg: Message): unknown {
		const name = yield {
			id: 'name',
			type: 'lowercase',
			flag: '--name',
			match: msg.interaction ? 'option' : 'phrase'
		};

		return { name };
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null;
	}

	public async exec(message: Message, { name: alias }: { name?: string }) {
		if (!alias) return message.util!.send('You must provide a clan tag or clan alias to run this command.');

		const deleted = await this.client.db.collection(Collections.CLAN_STORES)
			.findOneAndUpdate({
				guild: message.guild!.id,
				alias: { $exists: true },
				$or: [{ tag: this.parseTag(alias) }, { alias }]
			}, { $unset: { alias: '' } });

		if (!deleted.value) {
			return message.util!.send('**No matches found!**');
		}

		return message.util!.send(`_Successfully deleted **${deleted.value.alias as string}**_`);
	}
}
