import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';
import { Messages } from '../../util/Constants';

export default class AliasCommand extends Command {
	public constructor() {
		super('alias', {
			category: 'setup',
			channel: 'guild',
			description: {
				content: ['Create, Remove or View clan aliases.']
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			list: this.handler.modules.get('alias-list')!,
			create: this.handler.modules.get('alias-create')!,
			delete: this.handler.modules.get('alias-delete')!
		}[args.command];

		if (!command) return interaction.reply(Messages.COMMAND.OPTION_NOT_FOUND);
		return this.handler.exec(interaction, command, args);
	}
}
