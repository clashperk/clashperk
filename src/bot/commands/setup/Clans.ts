import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class ClansCommand extends Command {
	public constructor() {
		super('clans', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EmbedLinks']
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guildId);

		const embed = new EmbedBuilder()
			.setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
			.setColor(this.client.embed(interaction))
			.setFooter({ text: `Total ${clans.length}` })
			.setDescription([...clans.map((clan) => `[${clan.name} (${clan.tag})](${this.client.http.getClanURL(clan.tag)})`)].join('\n'));

		return interaction.reply({ embeds: [embed] });
	}
}
