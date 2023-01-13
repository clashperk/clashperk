import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class AutoRoleCommand extends Command {
	public constructor() {
		super('autorole', {
			category: 'setup',
			channel: 'guild',
			description: {
				content: ['Auto-assign roles to members based upon their role or town hall levels in the clan.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string; subCommand: string }) {
		if (args.subCommand === 'town-hall') {
			const command = {
				enable: this.handler.modules.get('setup-town-hall-roles')!,
				disable: this.handler.modules.get('setup-town-hall-roles')!
			}[args.command];

			if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
			return this.handler.continue(interaction, command);
		}
		const command = {
			enable: this.handler.modules.get('setup-clan-roles')!,
			disable: this.handler.modules.get('setup-clan-roles')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
