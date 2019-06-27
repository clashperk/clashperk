const { Command } = require('discord-akairo');

class InviteCommand extends Command {
	constructor() {
		super('invite', {
			aliases: ['invite'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Displays the bot invite link.' }
		});
	}

	async fetchInvite() {
		if (this.invite) return this.invite;
		const invite = await this.client.generateInvite([
			'CREATE_INSTANT_INVITE',
			'ADD_REACTIONS',
			'VIEW_CHANNEL',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'ATTACH_FILES',
			'READ_MESSAGE_HISTORY',
			'USE_EXTERNAL_EMOJIS'
		]);

		this.invite = invite;
		return invite;
	}

	async exec(message) {
		const embed = this.client.util.embed()
			.setColor(0x5970c1).setAuthor(this.client.user.username, this.client.user.displayAvatarURL())
			.setDescription([
				`**[Invite Me](${await this.fetchInvite()})**`,
				'**[Official Discord](https://discord.gg/8NP2XNV)**'
			]);
		return message.util.send({ embed });
	}
}

module.exports = InviteCommand;
