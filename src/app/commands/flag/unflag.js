const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');

class UnflagCommand extends Command {
	constructor() {
		super('unflag', {
			aliases: ['unflag'],
			category: 'flag',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Unflags a player from your server or clans.',
				usage: '<playerTag>',
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
				start: 'What is the player tag?',
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
		await mongodb.db('clashperk').collection('flaggedusers')
			.deleteOne({ guild: message.guild.id, tag: data.tag });

		return message.util.send(`Successfully unflagged **${data.name} (${data.tag})**`);
	}
}

module.exports = UnflagCommand;
