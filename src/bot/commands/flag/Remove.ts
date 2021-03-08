import { COLLECTIONS } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

// TODO: Fix Reply
export default class FlagRemoveCommand extends Command {
	public constructor() {
		super('flag-remove', {
			aliases: ['unflag'],
			category: '_hidden',
			channel: 'guild',
			description: {},
			userPermissions: ['MANAGE_GUILD'],
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const tag = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null
		};

		return { tag };
	}

	public async exec(message: Message, { tag }: { tag?: string }) {
		if (!tag) return message.util!.send('**You must provide a player tag to run this command.**');
		const data = await this.client.db.collection(COLLECTIONS.FLAGGED_USERS)
			.deleteOne({ guild: message.guild!.id, tag });
		if (!data.deletedCount) {
			return message.util!.send('Tag not found!');
		}

		return message.util!.send(`Successfully unflagged **${tag}**`);
	}
}
