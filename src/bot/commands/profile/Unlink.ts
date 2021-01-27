import { COLLECTIONS } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class UnlinkCommand extends Command {
	public constructor() {
		super('unlink', {
			aliases: ['unlink'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'EMBED_LINKS'],
			description: {
				content: 'Unlinks player/clan from your account.',
				usage: '<tag>',
				examples: ['#9Q92C8R20', '#8QU8J9LP']
			}
		});
	}

	public *args() {
		const tag = yield {
			type: (msg: Message, tag: string) => {
				if (!tag) return null;
				return `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}`;
			},
			prompt: {
				start: 'What is the player tag or clan tag?'
			}
		};

		return { tag };
	}

	public async exec(message: Message, { tag }: { tag: string }) {
		const deleted = await this.delete(message.author.id, tag);

		if (!deleted) {
			const clan = await this.client.db.collection(COLLECTIONS.LINKED_CLANS)
				.findOneAndDelete({ user: message.author.id, tag });
			if (clan.value?.tag) return message.util!.send({ embed: { description: `Successfully deleted **${clan.value.tag as string}**` } });

			return message.util!.send({
				embed: {
					description: `Couldn\'t find this tag linked to **${message.author.tag}**!`
				}
			});
		}

		return message.util!.send({ embed: { description: `Successfully deleted **${deleted.tag}**` } });
	}

	private async delete(id: string, tag: string) {
		this.client.http.unlinkPlayerTag(tag);

		const data = await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.findOneAndUpdate({ user: id }, { $pull: { tags: tag } });
		return data.value?.tags?.includes(tag) ? { tag } : null;
	}
}
