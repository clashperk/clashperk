import { Collections } from '../../util/Constants';
import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';

export default class AliasCreateCommand extends Command {
	public constructor() {
		super('alias-create', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			defer: true,
			ephemeral: true
		});
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/O/g, '0').replace(/^#/g, '')}` : null;
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; name?: string }) {
		if (!args.name) {
			return interaction.editReply('**You must provide an alias to run this command.**');
		}
		if (args.name.startsWith('#')) {
			return interaction.editReply('**Clan alias must not start with a hash (#).**');
		}

		const tag = this.parseTag(args.tag);
		if (!tag) {
			return interaction.editReply('**You must provide a clan tag to run this command.**');
		}

		const clan = await this.client.db.collection(Collections.CLAN_STORES).findOne({ guild: interaction.guild.id, alias: args.name });
		if (clan) {
			return interaction.editReply(`_An alias with the name **${args.name}** already exists!_`);
		}

		const updated = await this.client.db
			.collection(Collections.CLAN_STORES)
			.updateOne({ guild: interaction.guild.id, tag }, { $set: { alias: args.name.trim() } });
		if (!updated.matchedCount) {
			return interaction.editReply('*The clan must be linked to the server to create an alias.*');
		}

		return interaction.editReply(`_Successfully created an alias with the name **${args.name}**_`);
	}
}
