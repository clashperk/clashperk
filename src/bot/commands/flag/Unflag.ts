import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

// TODO: Fix Reply
export default class UnflagCommand extends Command {
	public constructor() {
		super('unflag', {
			aliases: ['unflag'],
			category: 'flag',
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
					type: 'uppercase'
				}
			]
		});
	}

	public async exec(message: Message, { tag }: { tag: string }) {
		const data = await this.client.db.collection('flaggedusers')
			.deleteOne({ guild: message.guild!.id, tag });
		if (!data.deletedCount) {
			return message.util!.send('Tag not found!');
		}

		return message.util!.send(`Successfully unflagged **${tag}**`);
	}
}
