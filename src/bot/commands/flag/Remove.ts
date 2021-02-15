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
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Unflags a player from your server or clans.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			},
			args: [
				{
					id: 'tag',
					type: (msg, tag) => tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null
				}
			]
		});
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
