import { Collections } from '../../util/Constants';
import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';

// TODO: Fix Reply
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
		if (!tag) return interaction.editReply('**You must provide a player tag to run this command.**');
		const data = await this.client.db.collection(Collections.FLAGS).deleteOne({ guild: interaction.guild!.id, tag: this.fixTag(tag) });
		if (!data.deletedCount) {
			return interaction.editReply('Tag not found!');
		}

		return interaction.editReply(`Successfully unflagged **${tag}**`);
	}
}
