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
		args: { roster: string; list_option?: 'pending' | 'unwanted' | 'all'; group?: string; message?: string }
	) {
		// if (args.list_option || args.group) return this.ping(interaction, args);

		if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });
		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster not found.', ephemeral: true });

		const updated = await this.client.rosterManager.updateMembers(roster, roster.members);
		if (!updated) return interaction.followUp({ content: 'This roster no longer exists.', ephemeral: true });

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

		const row = this.client.rosterManager.getRosterComponents({ roster: updated });
		const embed = this.client.rosterManager.getRosterEmbed(updated, categories);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	public async ping(
		interaction: CommandInteraction<'cached'>,
		args: { roster: string; list_option?: 'pending' | 'unwanted' | 'all'; group?: string; message?: string }
	) {
		if (!(args.list_option || args.group)) return interaction.editReply('Please provide an option or group.');
		if (!ObjectId.isValid(args.roster)) return interaction.editReply({ content: 'Invalid roster ID.' });

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.editReply({ content: 'Roster not found.' });
		if (!roster.members.length) return interaction.editReply({ content: 'This roster has no members.' });

		const clan = await this.client.http.clan(roster.clan.tag);
		if (!clan.ok) return interaction.editReply({ content: `Failed to fetch the clan \u200e${roster.clan.name} (${roster.clan.tag})` });

		const updated = await this.client.rosterManager.updateMembers(roster, roster.members);
		if (!updated) return interaction.editReply({ content: 'This roster no longer exists.' });

		if (args.group) {
			const groupMembers = updated.members.filter((member) => member.categoryId && member.categoryId.toHexString() === args.group);
			if (!groupMembers.length) return interaction.editReply({ content: 'No members found in this group.' });

			if (args.message) await interaction.editReply(`${roster.name} - ${roster.clan.name} (${roster.clan.tag})`);
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
			if (!pendingMembers.length) return interaction.editReply({ content: 'No pending members found.' });

			const members = await this.client.rosterManager.getClanMembers(pendingMembers);
			if (!members.length) return interaction.editReply({ content: 'No pending members found.' });

			const msgText = [
				`${roster.name} - ${roster.clan.name} (${roster.clan.tag})`,
				`Pending Members (Who belongs to the clan but has not signed up for the roster.)`
			].join('\n');
			if (args.message) await interaction.editReply(msgText);

			return interaction.followUp({
				content: [
					args.message ?? msgText,
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
			if (!unwantedMembers.length) return interaction.editReply({ content: 'No unwanted members found.' });

			if (args.message)
				await interaction.editReply(
					[
						`${roster.name} - ${roster.clan.name} (${roster.clan.tag})`,
						`Unwanted Members (Who signed up for the roster but does not belong to the clan.)`
					].join('\n')
				);
			return interaction.followUp({
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
			if (args.message) await interaction.editReply(`${roster.name} - ${roster.clan.name} (${roster.clan.tag})`);
			return interaction.followUp({
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
