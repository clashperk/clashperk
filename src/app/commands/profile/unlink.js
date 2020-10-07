const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');

class UnlinkCommand extends Command {
	constructor() {
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

	*args() {
		const tag = yield {
			type: async (msg, tag) => {
				if (!tag) return null;
				return `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}`;
			},
			prompt: {
				start: 'What is your player tag or clan tag?'
			}
		};

		return { tag };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { tag }) {
		const deleted = await this.delete(message.author.id, tag);
		if (!deleted) {
			const clan = await mongodb.db('clashperk')
				.collection('linkedclans')
				.findOneAndDelete({ user: message.author.id });
			if (clan.value?.tag) return message.util.send({ embed: { description: `Successfully deleted **${clan.tag}**` } });

			return message.util.send({
				embed: {
					description: `Couldn\'t find this tag linked to **${message.author.tag}**!`
				}
			});
		}

		return message.util.send({ embed: { description: `Successfully deleted **${deleted.tag}**` } });
	}

	async delete(id, tag) {
		const data = await mongodb.db('clashperk')
			.collection('linkedusers')
			.findOneAndUpdate({ user: id }, { $pull: { tags: tag } });
		return data.value?.tags?.includes(tag) || { tag };
	}
}

module.exports = UnlinkCommand;
