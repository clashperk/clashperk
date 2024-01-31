import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CategoryListCommand extends Command {
	public constructor() {
		super('category-list', {
			category: 'none',
			channel: 'guild',
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const categories = await this.client.storage.getOrCreateDefaultCategories(interaction.guildId);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild.name} Categories`, iconURL: interaction.guild.iconURL()! });
		embed.setDescription(categories.map((cat) => `1. ${cat.name} (order ${cat.order})`).join('\n'));

		return interaction.editReply({ embeds: [embed] });
	}
}
