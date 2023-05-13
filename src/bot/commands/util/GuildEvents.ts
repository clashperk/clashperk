import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class GameEvents extends Command {
	public constructor() {
		super('events', {
			category: 'config',
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const visibleEvents = this.client.guildEvents.getEvents(interaction.locale);
		const embed = new EmbedBuilder()
			.setAuthor({ name: 'Next Events in the Game' })
			.addFields(visibleEvents.map((event) => ({ name: event.name, value: `${event.value}\n\u200b` })))
			.setFooter({ text: `${visibleEvents.length} upcoming events` });
		return interaction.editReply({ embeds: [embed] });
	}
}
