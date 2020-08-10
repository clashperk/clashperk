const { Command } = require('discord-akairo');
const { Permissions } = require('discord.js');
const { stringify } = require('querystring');

class InviteCommand extends Command {
	constructor() {
		super('invite', {
			aliases: ['invite', 'support'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows bot invite & support server link.' }
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	get bitfield() {
		const permissions = new Permissions([
			'CREATE_INSTANT_INVITE',
			'ADD_REACTIONS',
			'VIEW_CHANNEL',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'ATTACH_FILES',
			'READ_MESSAGE_HISTORY',
			'USE_EXTERNAL_EMOJIS',
			'MANAGE_MESSAGES',
			'MANAGE_WEBHOOKS',
			'MANAGE_NICKNAMES'
		]);

		return permissions.bitfield;
	}

	async exec(message) {
		const query = stringify({
			client_id: this.client.user.id,
			permissions: this.bitfield,
			scope: 'bot'
		});
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`**[Invite Me](https://discord.com/api/oauth2/authorize?${query})**`,
				'**[Official Discord](https://discord.gg/ppuppun)**'
			]);
		return message.util.send({ embed });
	}
}

module.exports = InviteCommand;
