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

	public async exec(interaction: CommandInteraction<'cached'>, args: { command: string; type: string }) {
		if (args.command === 'refresh') {
			const command = this.handler.modules.get('autorole-refresh')!;
			return this.handler.continue(interaction, command);
		}

		if (['disable'].includes(args.command)) {
			const command = {
				'town-hall': this.handler.modules.get('setup-town-hall-roles')!,
				'clan-roles': this.handler.modules.get('setup-clan-roles')!,
				'leagues': this.handler.modules.get('setup-league-roles')!,
				'wars': this.handler.modules.get('setup-war-roles')!
			}[args.type];
			if (!command) throw Error('Command not found.');
			return this.handler.continue(interaction, command);
		}

		const command = {
			'town-hall': this.handler.modules.get('setup-town-hall-roles')!,
			'clan-roles': this.handler.modules.get('setup-clan-roles')!,
			'leagues': this.handler.modules.get('setup-league-roles')!,
			'wars': this.handler.modules.get('setup-war-roles')!
		}[args.command];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}