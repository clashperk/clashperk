import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
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

		const token = this.client.util.createToken({ userId: interaction.user.id, guildId: interaction.guild.id });
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setURL(`https://clashperk.com/clans?token=${token}`).setLabel('Reorder').setStyle(ButtonStyle.Link)
		);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}
}
