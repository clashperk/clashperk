import { Permissions, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import { stringify } from 'querystring';

export default class InviteCommand extends Command {
	public constructor() {
		super('invite', {
			aliases: ['invite', 'support'],
			category: 'config',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Get support server and bot invite link.' }
		});
	}

	private get bitfield() {
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
			'MANAGE_NICKNAMES',
			'MANAGE_ROLES'
		]);

		return permissions.bitfield;
	}

	public exec(message: Message) {
		const query = stringify({
			client_id: this.client.user!.id,
			scope: 'bot applications.commands',
			permissions: (this.bitfield | (1n << 38n)).toString()
		});
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(this.client.user!.username, this.client.user!.displayAvatarURL({ format: 'png' }))
			.setDescription([
				'ClashPerk can be added to as many servers as you want! Please share the bot with your friends. Thanks in advance!',
				'',
				`**[Add to Discord](https://discord.com/api/oauth2/authorize?${query})**`,
				'',
				'**[Support Discord](https://discord.gg/ppuppun)** | **[Become a Patron](https://www.patreon.com/clashperk)**'
			].join('\n'));
		return message.util!.send({ embeds: [embed] });
	}
}
