import { CommandInteraction, User } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CWLExportCommand extends Command {
	public constructor() {
		super('cwl-export', {
			category: 'none',
			channel: 'guild',
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		return this.handler.exec(interaction, this.handler.modules.get('export-cwl')!, { clans: clan.tag });
	}
}
