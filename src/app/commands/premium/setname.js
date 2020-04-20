const { Command } = require('discord-akairo');

class SetNickNameCommand extends Command {
	constructor() {
		super('setnick', {
			aliases: ['setnick'],
			category: 'owner',
			cooldown: 3000,
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
			description: { content: 'Sets nickname of a member' },
			args: [
				{
					id: 'member',
					type: 'guildMember',
					prompt: {
						start: 'What member do you want to set nickname?',
						retry: 'Please mention a valid member to change nickname.'
					}
				},
				{
					id: 'tag',
					type: 'player',
					prompt: {
						prompt: 'What is the player tag?',
						retry: 'Please provide a valid player tag.'
					}
				},
				{
					id: 'prefix',
					type: 'string',
					match: 'content'
				}
			]
		});
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
		await member.setNickname(name, `Nickname set by ${message.author.tag}`);

		const embed = this.client.util.embed()
			.setDescription([
				`Nickname set to ${name}`
			]);
		return message.util.send({ embed });
	}
}

module.exports = SetNickNameCommand;
