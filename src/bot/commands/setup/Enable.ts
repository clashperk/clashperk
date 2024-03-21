import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class SetupEnableCommand extends Command {
	public constructor() {
		super('setup-enable', {
			category: 'none',
			channel: 'guild',
			defer: false
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
			'war-feed': this.handler.modules.get('setup-clan-log')!,
			'legend-log': this.handler.modules.get('setup-clan-log')!,
			'capital-log': this.handler.modules.get('setup-clan-log')!,
			'join-leave': this.handler.modules.get('setup-clan-log')!
		}[args.option];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
