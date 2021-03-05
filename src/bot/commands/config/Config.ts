import { Message, TextChannel, PermissionString, User } from 'discord.js';
import { Command, PrefixSupplier, Flag } from 'discord-akairo';

export default class ConfigCommand extends Command {
	public constructor() {
		super('config', {
			aliases: ['config', 'settings'],
			category: 'config',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			description: {
				content: ['Manage or view server settings.'],
				examples: ['color #f96854', 'prefix ?'],
				usage: ['[prefix|color] <...args>']
			}
		});
	}

	public *args(): unknown {
		const sub = yield {
			type: [
				['config-color', 'color'],
				['config-prefix', 'prefix']
			],
			otherwise: (msg: Message) => this.handler.runCommand(msg, this, {})
		};

		return Flag.continue(sub);
	}

	public exec(message: Message) {
		const permissions = ['ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY'] as PermissionString[];
		const color = this.client.settings.get<number>(message.guild!, 'color', undefined);
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`Settings of ${message.guild!.name}`)
			.addField('Prefix', prefix)
			.addField('Patron', this.client.patrons.get(message.guild!.id) ? 'Yes' : 'No')
			.addField('Color', color ? `#${color.toString(16).toUpperCase()}` : 'None');

		if (!(message.channel as TextChannel).permissionsFor(message.guild!.me!)!.has(permissions, false)) {
			embed.addField('Missing Permission', [
				this.missingPermissions(message.channel as TextChannel, this.client.user as User, permissions)
			]);
		}

		const embeds = [
			embed,
			this.client.util.embed()
				.setColor(this.client.embed(message))
				.setDescription([
					`\`${prefix}config ${this.description.usage as string}\``,
					'',
					this.description.content.join('\n'),
					'',
					'**Examples**',
					this.description.examples.map((en: string) => `\`${prefix}config ${en}\``).join('\n')
				])
		];

		return embeds.map(async embed => message.util!.send({ embed }));
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
