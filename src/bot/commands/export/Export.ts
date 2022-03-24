import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';
import { Messages } from '../../util/Constants';

export default class ExportCommand extends Command {
	public constructor() {
		super('export', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: [
					'Export war or season stats to excel for all clans.',
					'',
					'**[Support us on Patreon](https://patreon.com/clashperk)**'
				]
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { option: string }) {
		const command = {
			missed: this.handler.modules.get('export-missed')!,
			season: this.handler.modules.get('export-season')!,
			wars: this.handler.modules.get('export-wars')!,
			members: this.handler.modules.get('export-members')!,
			lastwars: this.handler.modules.get('export-last-wars')!
		}[args.option];

		if (!command) return interaction.reply(Messages.COMMAND.OPTION_NOT_FOUND);
		return this.handler.continue(interaction, command);
	}
}
