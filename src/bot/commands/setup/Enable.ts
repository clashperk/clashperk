import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib';

export default class SetupEnableCommand extends Command {
	public constructor() {
		super('setup-enable', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: ['Enable features or assign clans to channels.']
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { option: string }) {
		const command = {
			'channel-link': this.handler.modules.get('setup-channel-link')!,
			'clan-embed': this.handler.modules.get('setup-clan-embed')!,
			'server-link': this.handler.modules.get('setup-server-link')!,
			'lastseen': this.handler.modules.get('setup-clan-log')!,
			'clan-feed': this.handler.modules.get('setup-clan-log')!,
			'donation-log': this.handler.modules.get('setup-clan-log')!,
			'clan-games': this.handler.modules.get('setup-clan-log')!,
			'war-feed': this.handler.modules.get('setup-clan-log')!
		}[args.option];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
