import { CommandInteraction } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Command } from '../../lib';
import { Util } from '../../util';

export default class AliasListCommand extends Command {
	public constructor() {
		super('alias-list', {
			category: 'none',
			channel: 'guild',
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.db
			.collection(Collections.CLAN_STORES)
			.find({ guild: interaction.guild.id, alias: { $exists: true } })
			.toArray();

		const chunks = Util.splitMessage(
			[
				`**${interaction.guild.name} Clan Aliases**`,
				'',
				clans
					.map((clan) => `• **${clan.name as string} (${clan.tag as string})**\n\u2002 **Alias:** ${clan.alias as string}`)
					.join('\n\n')
			].join('\n')
		);

		for (const content of chunks) await interaction.followUp({ content, ephemeral: true });
	}
}
