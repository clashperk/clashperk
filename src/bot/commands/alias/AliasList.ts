import { CommandInteraction } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

export default class AliasListCommand extends Command {
	public constructor() {
		super('alias-list', {
			category: 'setup',
			channel: 'guild',
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.db
			.collection(Collections.CLAN_STORES)
			.find({ guild: interaction.guild.id, alias: { $exists: true } }, { sort: { name: 1 } })
			.toArray();

		const chunks = Util.splitMessage(
			[
				`**${this.i18n('command.alias.list.title', { lng: interaction.locale })}**`,
				'',
				clans
					.map((clan) => `• **${clan.name as string} (${clan.tag as string})**\n\u2002 **Alias:** ${clan.alias as string}`)
					.join('\n\n')
			].join('\n')
		);

		for (const content of chunks) await interaction.followUp({ content, ephemeral: true });
	}
}
