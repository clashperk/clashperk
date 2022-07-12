import { CommandInteraction } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Command } from '../../lib';

export default class FlagDeleteCommand extends Command {
	public constructor() {
		super('flag-delete', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			defer: true
		});
	}

	private fixTag(tag: string) {
		return `#${tag.toUpperCase().replace(/O/g, '0').replace(/^#/g, '')}`;
	}

	public async exec(interaction: CommandInteraction, { tag }: { tag?: string }) {
		if (!tag) return interaction.editReply(this.i18n('command.flag.delete.no_tag', { lng: interaction.locale }));
		const data = await this.client.db.collection(Collections.FLAGS).deleteOne({ guild: interaction.guild!.id, tag: this.fixTag(tag) });
		if (!data.deletedCount) {
			return interaction.editReply(this.i18n('command.flag.delete.no_result', { lng: interaction.locale, tag }));
		}

		return interaction.editReply(this.i18n('command.flag.delete.success', { lng: interaction.locale, tag }));
	}
}
