import { Message } from 'discord.js';
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
				['config-prefix', 'prefix'],
				['config-events', 'events']
			],
			otherwise: (msg: Message) => this.handler.runCommand(msg, this, {})
		};

		return Flag.continue(sub);
	}

	public exec(message: Message) {
		const color = this.client.settings.get<number>(message.guild!, 'color', undefined);
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor({ name: `Settings of ${message.guild!.name}` })
			.addField('Prefix', prefix)
			.addField('Patron', this.client.patrons.get(message.guild!.id) ? 'Yes' : 'No')
			.addField('Color', color ? `#${color.toString(16).toUpperCase()}` : 'None');

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
				].join('\n'))
		];

		return message.util!.send({ embeds });
	}
}
