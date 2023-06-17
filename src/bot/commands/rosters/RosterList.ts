import { CommandInteraction, EmbedBuilder, User, escapeMarkdown } from 'discord.js';
import { Filter } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster } from '../../struct/RosterManager.js';

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

	public async exec(interaction: CommandInteraction<'cached'>, args: { user?: User; player_tag?: string; name?: string; clan?: string }) {
		const query: Filter<IRoster> = { guildId: interaction.guild.id };
		if (args.user) query['members.userId'] = args.user.id;
		if (args.player_tag) query['members.playerTag'] = args.player_tag;
		if (args.name) query.$text = { $search: args.name };
		if (args.clan) query['clan.tag'] = args.clan;

		const isSearch = Object.keys(query).length > 1;
		const rosters = isSearch
			? await this.client.rosterManager.query(query)
			: await this.client.rosterManager.list(interaction.guild.id);

		const embeds: EmbedBuilder[] = [];
		const rosterEmbed = new EmbedBuilder().setTitle('Rosters').setDescription(
			rosters
				.map((roster, i) => {
					const closed = this.client.rosterManager.isClosed(roster) ? '[CLOSED] ' : '';
					const memberCount = `${roster.memberCount}/${roster.maxMembers ?? 50}`;
					return `**${i + 1}.** ${escapeMarkdown(`\u200e${roster.name} ${closed}${roster.clan.name} (${memberCount})`)}`;
				})
				.join('\n')
		);
		if (isSearch) rosterEmbed.setFooter({ text: 'Search Results' });
		if (rosters.length) embeds.push(rosterEmbed);

		if (isSearch) {
			if (!embeds.length) return interaction.editReply({ content: 'No rosters found.' });
			return interaction.editReply({ embeds });
		}

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
		const groupEmbed = new EmbedBuilder().setTitle('User Groups').setDescription(
			categories
				.map((category, i) => {
					return `**${i + 1}.** ${escapeMarkdown(category.displayName)} ${category.roleId ? `- <@&${category.roleId}>` : ''}`;
				})
				.join('\n')
		);
		if (categories.length) embeds.push(groupEmbed);

		if (!embeds.length) return interaction.editReply({ content: 'No rosters or groups found.' });
		return interaction.editReply({ embeds });
	}
}
