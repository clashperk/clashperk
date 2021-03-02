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
				content: 'Get or change the server prefix.',
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

	public async exec(message: Message, { prefix }: { prefix: string | null }) {
		if (/^<@!?(\d+)>$/.test(message.content) && !message.mentions.has(this.client.user!.id)) return;

		const oldPrefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		if (!prefix) {
			return message.util!.send(`Use the prefix \`${oldPrefix}\` to run my commands`);
		}

		if (prefix && !message.member!.permissions.has('MANAGE_GUILD')) {
			return message.util!.send([
				`Use the prefix \`${oldPrefix}\` to run my commands`,
				'',
				'You are missing `Manage Server` permission to change the prefix'
			]);
		}

		this.client.settings.set(message.guild!, 'prefix', prefix);
		if (message.guild!.me?.hasPermission('CHANGE_NICKNAME')) {
			await message.guild!.me.setNickname(`${this.client.user!.username} [ ${prefix} ]`).catch(() => null);
		}

		return message.util!.send(`Prefix has been reset to \`${prefix}\``);
	}
}
