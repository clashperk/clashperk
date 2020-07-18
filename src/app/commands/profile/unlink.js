const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');

class UnlinkCommand extends Command {
	constructor() {
		super('unlink', {
			aliases: ['unlink'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'EMBED_LINKS'],
			description: {
				content: 'Unlinks profile from your account.',
				usage: '<tag>',
				examples: ['#9Q92C8R20']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.player(args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			},
			prompt: {
				start: 'What is your player tag?',
				retry: (msg, { failure }) => failure.value
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const deleted = await this.delete(message.author.id, data.tag);
		if (!deleted) {
			return message.util.send({
				embed: {
					description: `Couldn\'t find a player linked to **${message.author.tag}**!`
				}
			});
		}

		const embed = this.client.util.embed()
			.setAuthor(`Successfully deleted ${data.tag}`);
		return message.util.send({ embed });
	}

	async delete(id, tag) {
		const data = await mongodb.db('clashperk')
			.collection('linkedusers')
			.findOneAndUpdate({ user: id }, { $pull: { tags: tag } });
		return data.value && data.value.tags && data.value.tags.includes(tag);
	}
}

module.exports = UnlinkCommand;
