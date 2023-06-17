import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';

export default class RosterPostCommand extends Command {
	public constructor() {
		super('roster-post', {
			category: 'roster',
			channel: 'guild',
			description: {
				content: ['Create, delete, edit or view rosters.']
			},
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { roster: string; option?: 'pending' | 'unwanted' | 'all'; group?: string; message?: string }
	) {
		if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster not found.', ephemeral: true });

		const updated = await this.client.rosterManager.updateMembers(roster, roster.members);
		if (!updated) return interaction.followUp({ content: 'This roster no longer exists.', ephemeral: true });

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

		const row = this.client.rosterManager.getRosterComponents({
			roster: updated
		});
		const embed = this.client.rosterManager.getRosterEmbed(updated, categories);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	public async ping(
		interaction: CommandInteraction<'cached'>,
		args: { roster: string; list_option?: 'pending' | 'unwanted' | 'all'; group?: string; message?: string }
	) {
		if (!(args.list_option || args.group)) return interaction.editReply('Please provide an option or group.');

		if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster not found.', ephemeral: true });
		if (!roster.members.length) return interaction.followUp({ content: 'This roster has no members.', ephemeral: true });

		const clan = await this.client.resolver.resolveClan(interaction, roster.clan.tag);
		if (!clan) return;

		const updated = await this.client.rosterManager.updateMembers(roster, roster.members);
		if (!updated) return interaction.followUp({ content: 'This roster no longer exists.', ephemeral: true });

		if (args.group) {
			const groupMembers = updated.members.filter((member) => member.categoryId && member.categoryId.toHexString() === args.group);
			if (!groupMembers.length) return interaction.followUp({ content: 'No members found in this group.', ephemeral: true });

			return interaction.editReply({
				content: [
					args.message ?? '',
					'',
					groupMembers
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		if (args.list_option === 'pending') {
			const pendingMembers = clan.memberList.filter((member) => !updated.members.some((m) => m.tag === member.tag));
			if (!pendingMembers.length) return interaction.followUp({ content: 'No pending members found.', ephemeral: true });

			const members = await this.client.rosterManager.getClanMembers(pendingMembers);
			if (!members.length) return interaction.followUp({ content: 'No pending members found.', ephemeral: true });

			return interaction.editReply({
				content: [
					args.message ?? '',
					'',
					members
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		if (args.list_option === 'unwanted') {
			const unwantedMembers = updated.members.filter((member) => !member.clan || member.clan.tag !== clan.tag);
			if (!unwantedMembers.length) return interaction.followUp({ content: 'No unwanted members found.', ephemeral: true });

			return interaction.editReply({
				content: [
					args.message ?? '',
					'',
					unwantedMembers
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		if (args.list_option === 'all') {
			return interaction.editReply({
				content: [
					args.message ?? '',
					'',
					updated.members
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		return interaction.editReply('Please provide an option or group.');
	}
}
