import { Collections } from '../../util/Constants';
import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';

export default class AliasDeleteCommand extends Command {
	public constructor() {
		super('alias-delete', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			ephemeral: true,
			defer: true
		});
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/O/g, '0').replace(/^#/g, '')}` : null;
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { name?: string }) {
		if (!args.name) return interaction.editReply('You must provide a clan tag or clan alias to run this command.');

		const deleted = await this.client.db.collection(Collections.CLAN_STORES).findOneAndUpdate(
			{
				guild: interaction.guild.id,
				alias: { $exists: true },
				$or: [{ tag: this.parseTag(args.name) }, { alias: args.name.trim() }]
			},
			{ $unset: { alias: '' } }
		);

		if (!deleted.value) {
			return interaction.editReply('**No matches found!**');
		}

		return interaction.editReply(`_Successfully deleted **${deleted.value.alias as string}**_`);
	}
}
