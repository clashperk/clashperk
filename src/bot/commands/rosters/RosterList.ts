import { CommandInteraction, EmbedBuilder, escapeMarkdown, time } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class RosterListCommand extends Command {
	public constructor() {
		super('roster-list', {
			category: 'roster',
			channel: 'guild',
			description: {
				content: ['Create, delete, edit or view rosters.']
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, _args: unknown) {
		const rosters = await this.client.rosterManager.list(interaction.guild.id);
		const embeds = [];

		const rosterEmbed = new EmbedBuilder().setTitle('Rosters').setDescription(
			rosters
				.map((roster, i) => {
					return `**${i + 1}.** ${escapeMarkdown(
						`${roster.clan.name} - ${roster.name} (${roster.memberCount}/${roster.maxMembers ?? 75}) - ${time(
							roster.createdAt,
							'D'
						)}`
					)}`;
				})
				.join('\n')
		);
		if (rosters.length) embeds.push(rosterEmbed);

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
		const groupEmbed = new EmbedBuilder().setTitle('Categories').setDescription(
			categories
				.map((category, i) => {
					return `**${i + 1}.** ${escapeMarkdown(
						`${category.displayName} ${category.roleId ? `- <@&${category.roleId}>` : ''}`
					)}`;
				})
				.join('\n')
		);
		if (categories.length) embeds.push(groupEmbed);

		if (!embeds.length) return interaction.editReply({ content: 'No rosters or categories found.' });
		return interaction.editReply({ embeds });
	}
}
