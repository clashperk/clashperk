import { Command, Flag, PrefixSupplier } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';

export default class FlagCommand extends Command {
	public constructor() {
		super('flag', {
			aliases: ['flag'],
			category: 'setup',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: [
					'Manage player flags in a server or clan.',
					'',
					'This is a feature to mark players as banned or flagged and get notified whenever they join back to the clan or clan family.',
					'',
					'To receive notification you must setup **Clan Feed** with a mentionable role. Flags are per server basis. It doesn\'t travel among Discord servers and not accessible from other servers.',
					'',
					'• **Add Flag**',
					'• `flag add #PLAYER_TAG ...REASON`',
					'',
					'• **Remove Flag**',
					'• `flag remove #PLAYER_TAG`',
					'',
					'• **Flag List**',
					'• `flag list [--export]`',
					'',
					'• **View Flag**',
					'• `flag show #PLAYER_TAG`'
				],
				usage: '<method> <...args>',
				examples: ['add #9Q92C8R20 Hopper', 'show #9Q92C8R20', 'remove #9Q92C8R20', 'list --export']
			}
		});
	}

	public *args() {
		const sub = yield {
			type: [
				['flag-add', 'add'],
				['flag-list', 'list'],
				['flag-show', 'show', 'check', 'view'],
				['flag-remove', 'remove', 'del', 'delete']
			],
			otherwise: (message: Message) => {
				const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
				const embed = new MessageEmbed()
					.setColor(this.client.embed(message))
					.setDescription([
						`\`${prefix}flag ${this.description.usage as string}\``,
						'',
						this.description.content.join('\n'),
						'',
						'**Examples**',
						this.description.examples.map((en: string) => `\`${prefix}flag ${en}\``).join('\n')
					]);

				return { embed, content: '**You must provide a valid argument to run this command, check examples and usage below.**' };
			}
		};

		return Flag.continue(sub);
	}
}
