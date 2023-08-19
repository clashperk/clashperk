import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
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

	public autocomplete(interaction: AutocompleteInteraction<'cached'>, args: { player_tag?: string }) {
		return this.client.autocomplete.flagSearchAutoComplete(interaction, args);
	}

	public async exec(interaction: CommandInteraction<'cached'>, { player_tag }: { player_tag?: string }) {
		if (!player_tag) return interaction.editReply(this.i18n('command.flag.delete.no_tag', { lng: interaction.locale }));
		const playerTag = this.client.http.fixTag(player_tag);

		const flags = await this.client.db
			.collection(Collections.FLAGS)
			.find({ guild: interaction.guild.id, tag: playerTag })
			.sort({ _id: -1 })
			.toArray();

		if (!flags.length) {
			return interaction.editReply(this.i18n('command.flag.delete.no_result', { lng: interaction.locale, tag: player_tag }));
		}

		await this.client.db.collection(Collections.FLAGS).deleteMany({ guild: interaction.guild.id, tag: playerTag });
		return interaction.editReply(this.i18n('command.flag.delete.success', { lng: interaction.locale, tag: player_tag }));
	}
}
