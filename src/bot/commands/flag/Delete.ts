import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';

export default class FlagDeleteCommand extends Command {
	public constructor() {
		super('flag-delete', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			defer: true
		});
	}

	private fixTag(tag: string) {
		return `#${tag.toUpperCase().replace(/O/g, '0').replace(/^#/g, '')}`;
	}

	public async exec(interaction: CommandInteraction, { tag, id }: { tag?: string; id: string }) {
		if (!tag) return interaction.editReply(this.i18n('command.flag.delete.no_tag', { lng: interaction.locale }));
		const flags = await this.client.db
			.collection(Collections.FLAGS)
			.find({ guild: interaction.guild!.id, tag: this.fixTag(tag) })
			.toArray();

		if (!flags.length) {
			return interaction.editReply(this.i18n('command.flag.delete.no_result', { lng: interaction.locale, tag }));
		}

		const flagId = flags[Number(id) - 1]?._id as ObjectId | null;
		if (!flagId || flags.length > 1) {
			return interaction.editReply(this.i18n('command.flag.delete.no_result', { lng: interaction.locale, tag }));
		}

		await this.client.db.collection(Collections.FLAGS).deleteOne({ $or: [{ _id: flagId }, { _id: flags[0]._id }] });
		return interaction.editReply(this.i18n('command.flag.delete.success', { lng: interaction.locale, tag }));
	}
}
