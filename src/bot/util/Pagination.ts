import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, ButtonInteraction } from 'discord.js';
import { container } from 'tsyringe';
import Client from '../struct/Client.js';

const NEXT = '➡️';
const PREV = '⬅️';

export const handlePagination = async (
	interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
	embeds: EmbedBuilder[],
	onExport?: (interaction: ButtonInteraction<'cached'>) => unknown
) => {
	const client = container.resolve(Client);

	const customIds = {
		next: client.uuid(interaction.user.id),
		prev: client.uuid(interaction.user.id),
		export: client.uuid(interaction.user.id)
	};

	const row = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(new ButtonBuilder().setCustomId(customIds.prev).setEmoji(PREV).setStyle(ButtonStyle.Secondary))
		.addComponents(new ButtonBuilder().setCustomId(customIds.next).setEmoji(NEXT).setStyle(ButtonStyle.Secondary));
	const indexButton = new ButtonBuilder()
		.setCustomId(customIds.next)
		.setLabel(`${1}/${embeds.length}`)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true)
		.setCustomId('disabled');
	row.addComponents(indexButton);

	const exportButton = new ButtonBuilder().setCustomId(customIds.export).setLabel(`Export`).setStyle(ButtonStyle.Secondary);
	if (typeof onExport === 'function') row.addComponents(exportButton);

	let index = 0;
	const msg = await interaction.editReply({ embeds: [embeds[index]], components: [row] });

	const collector = msg.createMessageComponentCollector({
		filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
		time: 10 * 60 * 1000
	});

	collector.on('collect', async (action) => {
		if (action.customId === customIds.next) {
			index++;
			if (index >= embeds.length) index = 0;
			indexButton.setLabel(`${index + 1}/${embeds.length}`);
			await action.update({ embeds: [embeds[index]], components: [row] });
		}

		if (action.customId === customIds.prev) {
			index--;
			if (index < 0) index = embeds.length - 1;
			indexButton.setLabel(`${index + 1}/${embeds.length}`);
			await action.update({ embeds: [embeds[index]], components: [row] });
		}

		if (action.customId === customIds.export && action.isButton()) {
			exportButton.setDisabled(true);
			await interaction.editReply({ components: [row] });

			await action.deferReply();
			await onExport?.(action);
		}
	});

	collector.on('end', async (_, reason) => {
		Object.values(customIds).forEach((id) => client.components.delete(id));
		if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
	});

	return row;
};
