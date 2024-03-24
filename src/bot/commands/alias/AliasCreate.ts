import { CommandInteraction } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';

export default class AliasCreateCommand extends Command {
	public constructor() {
		super('alias-create', {
			category: 'setup',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			defer: true,
			ephemeral: true
		});
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/O/g, '0').replace(/^#/g, '')}` : null;
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { clan: string; name: string }) {
		if (!args.name) {
			return interaction.editReply(this.i18n('command.alias.create.no_name', { lng: interaction.locale }));
		}
		if (args.name.startsWith('#')) {
			return interaction.editReply(this.i18n('command.alias.create.no_hash', { lng: interaction.locale }));
		}
		if (args.name && /\s+/g.test(args.name)) {
			return interaction.editReply(this.i18n('command.alias.create.no_whitespace', { lng: interaction.locale }));
		}

		const tag = this.parseTag(args.clan);
		if (!tag) {
			return interaction.editReply(this.i18n('command.alias.create.no_clan', { lng: interaction.locale }));
		}

		const clan = await this.client.db.collection(Collections.CLAN_STORES).findOne({ guild: interaction.guild.id, alias: args.name });
		if (clan) {
			return interaction.editReply(this.i18n('command.alias.create.exists', { lng: interaction.locale, name: args.name }));
		}

		const updated = await this.client.db
			.collection(Collections.CLAN_STORES)
			.updateOne({ guild: interaction.guild.id, tag }, { $set: { alias: args.name.trim() } });
		if (!updated.matchedCount) {
			return interaction.editReply(this.i18n('command.alias.create.clan_not_linked', { lng: interaction.locale }));
		}

		return interaction.editReply(this.i18n('command.alias.create.success', { lng: interaction.locale, name: args.name }));
	}
}
