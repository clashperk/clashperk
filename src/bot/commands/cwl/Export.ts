import { CommandInteraction, Interaction, EmbedBuilder, User } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CWLExportCommand extends Command {
	public constructor() {
		super('cwl-export', {
			category: 'none',
			channel: 'guild',
			defer: true
		});
	}

	public condition(interaction: Interaction<'cached'>) {
		if (!this.client.patrons.get(interaction)) {
			const embed = new EmbedBuilder()
				.setDescription(this.i18n('common.patron_only', { lng: interaction.locale }))
				.setImage('https://cdn.discordapp.com/attachments/806179502508998657/846700124134178826/unknown.png');
			return { embeds: [embed] };
		}
		return null;
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		return this.handler.exec(interaction, this.handler.modules.get('export-cwl')!, { clans: clan.tag });
	}
}
