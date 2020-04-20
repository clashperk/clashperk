const { Command } = require('discord-akairo');

class SetNickNameCommand extends Command {
	constructor() {
		super('setnick', {
			aliases: ['setnick'],
			category: 'owner',
			cooldown: 3000,
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
			description: { content: 'Sets nickname of a member' }
		});
	}

	*args() {
		const member = yield {
			type: 'guildMember',
			prompt: {
				start: 'What member do you want to set nickname?',
				retry: 'Please mention a valid member to change nickname.'
			}
		};

		const player = yield {
			type: 'player',
			prompt: {
				prompt: 'What is the player tag?',
				retry: (msg, { failure }) => failure.value
			}
		};

		const prefix = yield {
			type: 'string',
			match: 'content'
		};

		return { prefix, member, player };
	}

	async exec(message, { prefix, member, player }) {
		if (member.roles.highest.position <= message.guild.me.roles.highest.position || member.id === message.guild.ownerID) {
			const embed = this.client.util.embed()
				.setDescription([
					'I do not have permission to change nickname of this user ~'
				]);
			return message.util.send({ embed });
		}

		const name = [prefix, player.name].join(' ');
		console.log(name);
		await member.setNickname(name, `Nickname set by ${message.author.tag}`);

		const embed = this.client.util.embed()
			.setDescription([
				`Nickname set to ${name}`
			]);
		return message.util.send({ embed });
	}
}

module.exports = SetNickNameCommand;
