const { Command, Flag } = require('discord-akairo');
const Resolver = require('../../struct/Resolver');

class SetNickNameCommand extends Command {
	constructor() {
		super('setnick', {
			aliases: ['setnick'],
			category: 'premium',
			cooldown: 3000,
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Sets nickname of a member',
				usage: '<user> <playerTag> <prefix>'
			}
		});
	}

	*args() {
		const member = yield {
			type: 'member',
			prompt: {
				start: 'What member do you want to set nickname?',
				retry: 'Please mention a valid member to change nickname.'
			}
		};

		const player = yield {
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

		const prefix = yield {
			type: 'string',
			match: 'rest'
		};

		return { prefix, member, player };
	}

	async exec(message, { prefix, member, player }) {
		if (message.guild.me.roles.highest.position <= member.roles.highest.position || member.id === message.guild.ownerID) {
			const embed = this.client.util.embed()
				.setDescription([
					'I do not have permission to change nickname of this user ~'
				]);
			return message.util.send({ embed });
		}

		const name = [prefix, player.name].join(' ');

		if (name.length > 31) {
			const embed = this.client.util.embed()
				.setDescription([
					'Too large name ~ < 31'
				]);
			return message.util.send({ embed });
		}

		await member.setNickname(name, `Nickname set by ${message.author.tag}`);

		const embed = this.client.util.embed()
			.setDescription([
				`Nickname set to **${name}**`
			]);
		return message.util.send({ embed });
	}
}

module.exports = SetNickNameCommand;
