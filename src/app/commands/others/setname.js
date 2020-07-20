const { Command, Flag } = require('discord-akairo');
const Resolver = require('../../struct/Resolver');

class SetNickNameCommand extends Command {
	constructor() {
		super('setnick', {
			aliases: ['nick', 'setnick'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
			userPermissions: ['MANAGE_NICKNAMES'],
			description: {
				content: [
					'Sets nickname of a member in discord.',
					'',
					'**Extra**',
					'Must include "|" to add a prefix or suffix of the nickname.',
					'Prefix ends with "|" and Suffix starts with "|"',
					'',
					'For additional `[...extra]` usage refer to the examples below.'
				],
				usage: '<@user> <PlayerTag> [...extra]',
				examples: ['@Suvajit #9Q92C8R20', '@Suvajit #9Q92C8R20 AH |', '@Suvajit #9Q92C8R20 | AH'],
				image: {
					text: [
						'**More Examples**'
					],
					url: 'https://i.imgur.com/rrAK4uj.png'
				}
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
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

		const txt = yield {
			type: 'string',
			match: 'rest',
			default: ''
		};

		return { txt, member, player };
	}

	async exec(message, { txt, member, player }) {
		if (message.guild.me.roles.highest.position <= member.roles.highest.position || member.id === message.guild.ownerID) {
			const embed = this.client.util.embed()
				.setDescription([
					'I do not have permission to change nickname of this user ~'
				]);
			return message.util.send({ embed });
		}

		let name = '';
		if (txt.length && txt.trim().startsWith('|')) {
			name = `${player.name} ${txt}`;
		} else if (txt.length && txt.trim().endsWith('|')) {
			name = `${txt} ${player.name}`;
		} else {
			name = `${player.name}`;
		}

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
