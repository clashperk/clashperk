const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const { Util } = require('discord.js');

class FlagCommand extends Command {
	constructor() {
		super('flag', {
			aliases: ['flag'],
			category: 'other',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Flags a player in your server or clans.',
				usage: '<playerTag> <reason>',
				examples: ['#9Q92C8R20 Hopper']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.player(args);
				if (resolved.status !== 200) {
					if (resolved.status === 404) {
						return Flag.fail(resolved.embed.description);
					}
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			},
			prompt: {
				start: 'What is the player tag?',
				retry: (msg, { failure }) => failure.value
			}
		};

		const reason = yield {
			type: 'string',
			match: 'rest',
			prompt: {
				start: 'What is the reason?'
			}
		};

		return { data, reason };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data, reason }) {
		if (reason.length > 900) return message.util.send('Reason must be 1024 or fewer in length.');
		const flags = await mongodb.db('clashperk')
			.collection('flaggedusers')
			.find({ guild: message.guild.id })
			.toArray();

		if (flags.length >= 200 && !this.client.patron.get(message.guild.id, 'guild', false)) {
			const embed = this.client.util.embed()
				.setDescription([
					'You can only flag 200 players per guild!',
					'',
					'**Want more than that?**',
					'Please consider supporting us on patreon!',
					'',
					'[Become a Patron](https://www.patreon.com/bePatron?u=14584309)'
				]);

			return message.util.send({ embed });
		}

		await mongodb.db('clashperk').collection('flaggedusers')
			.findOneAndUpdate({ guild: message.guild.id, tag: data.tag }, {
				$set: {
					guild: message.guild.id,
					user: message.author.id,
					user_tag: message.author.tag,
					tag: data.tag,
					name: data.name,
					reason: Util.cleanContent(reason, message),
					createdAt: new Date()
				}
			}, { upsert: true });

		return message.util.send(`Successfully flagged **${data.name} (${data.tag})**`);
	}
}

module.exports = FlagCommand;
