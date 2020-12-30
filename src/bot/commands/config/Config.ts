import { Message, TextChannel, PermissionString, User } from 'discord.js';
import { Command, PrefixSupplier } from 'discord-akairo';

export default class ConfigCommand extends Command {
	public constructor() {
		super('config', {
			aliases: ['config', 'settings'],
			category: 'config',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			description: {
				content: 'Displays settings of the server.',
				examples: ['']
			}
		});
	}

	public exec(message: Message) {
		const permissions = ['ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY'] as PermissionString[];
		const color = this.client.settings.get<number>(message.guild!, 'color', 0x5970c1);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`Settings of ${message.guild!.name}`)
			.addField('Prefix', (this.handler.prefix as PrefixSupplier)(message))
			.addField('Patron', this.client.patrons.get(message.guild!.id) ? 'Yes' : 'No')
			.addField('Color', `#${color.toString(16).toUpperCase()}`);

		if (!(message.channel as TextChannel).permissionsFor(message.guild!.me!)!.has(permissions, false)) {
			embed.addField('Missing Permission', [
				this.missingPermissions(message.channel as TextChannel, this.client.user as User, permissions)
			]);
		}

		return message.util!.send({ embed });
	}

	private missingPermissions(channel: TextChannel, user: User, permissions: PermissionString[]) {
		const missingPerms = channel.permissionsFor(user)!.missing(permissions)
			.map(str => {
				if (str === 'VIEW_CHANNEL') return 'Read Messages';
				return str.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase());
			});
		return missingPerms.join('\n');
	}
}
