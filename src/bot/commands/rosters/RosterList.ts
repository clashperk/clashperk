import { CommandInteraction, EmbedBuilder, escapeMarkdown, time } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class RosterListCommand extends Command {
	public constructor() {
		super('roster-list', {
			category: 'roster',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			description: {
				content: ['Create, delete, edit or view rosters.']
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, _args: unknown) {
		const rosters = await this.client.rosterManager.list(interaction.guild.id);
		if (!rosters.length) return interaction.editReply({ content: 'No rosters found.' });

		const embed = new EmbedBuilder().setTitle('Rosters').setDescription(
			rosters
				.map((roster, i) => {
					return `**${i + 1}.** ${escapeMarkdown(`${roster.clan.name} - ${roster.name} - ${time(roster.createdAt, 'D')}`)}`;
				})
				.join('\n')
		);

		return interaction.editReply({ embeds: [embed] });
	}
}
