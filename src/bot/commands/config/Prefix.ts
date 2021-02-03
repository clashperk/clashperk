import { Command, PrefixSupplier, Argument } from 'discord-akairo';
import { Message } from 'discord.js';

export default class PrefixCommand extends Command {
	public constructor() {
		super('config-prefix', {
			aliases: ['prefix'],
			category: 'config',
			channel: 'guild',
			quoted: false,
			description: {
				content: 'Displays or changes the prefix of the server.',
				usage: '<prefix>',
				examples: ['!', '?']
			},
			args: [
				{
					id: 'prefix',
					type: Argument.validate('string', (msg, p) => !/\s/.test(p) && p.length <= 3),
					prompt: {
						retry: 'Please provide a prefix without spaces and less than 3 characters.',
						optional: true
					}
				}
			]
		});
	}

	// @ts-expect-error
	public regex() {
		return new RegExp(`^<@!?(${this.client.user!.id})>$`, 'i');
	}

	public exec(message: Message, { prefix }: { prefix: string | null }) {
		if (/^<@!?(\d+)>$/.test(message.content) && !message.mentions.has(this.client.user!.id)) return;
		if (!prefix) {
			return message.util!.send(`The current prefix for this server is \`${(this.handler.prefix as PrefixSupplier)(message) as string}\``);
		}
		if (prefix && !message.member!.permissions.has('MANAGE_GUILD')) {
			return message.util!.send([
				`The current prefix for this server is \`${(this.handler.prefix as PrefixSupplier)(message) as string}\``,
				'You are missing `Manage Server` to change the prefix.'
			]);
		}
		this.client.settings.set(message.guild!, 'prefix', prefix);
		if (prefix === (this.handler.prefix as PrefixSupplier)(message) as string) {
			return message.util!.send(`Prefix has been reset to \`${prefix}\``);
		}
		return message.util!.send(`Prefix has been set to \`${prefix}\``);
	}
}
