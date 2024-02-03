import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

export default class RosterPingCommand extends Command {
	public constructor() {
		super('roster-ping', {
			category: 'roster',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			roleKey: Settings.ROSTER_MANAGER_ROLE,
			description: {
				content: ['Ping members that relates to the roster.']
			},
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { roster: string; ping_option?: 'pending' | 'unwanted' | 'everyone'; group?: string; message?: string }
	) {
		if (!(args.ping_option || args.group)) return interaction.editReply('Please provide a ping option or a user-group.');
		if (!ObjectId.isValid(args.roster)) return interaction.editReply({ content: 'Invalid roster ID.' });

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.editReply({ content: 'Roster not found.' });

		const { body: clan, res } = await this.client.http.getClan(roster.clan.tag);
		if (!res.ok) return interaction.editReply({ content: `Failed to fetch the clan \u200e${roster.clan.name} (${roster.clan.tag})` });

		const updated = await this.client.rosterManager.updateMembers(roster, roster.members);
		if (!updated) return interaction.editReply({ content: 'This roster no longer exists.' });

		// close all rosters that should be closed
		this.client.rosterManager.closeRosters(interaction.guild.id);

		const msgText = [`**Roster:** ${roster.name} - ${roster.clan.name} (${roster.clan.tag})`].join('\n');

		if (args.group) {
			const groupMembers = updated.members.filter((member) => member.categoryId && member.categoryId.toHexString() === args.group);
			if (!groupMembers.length) return interaction.editReply({ content: 'No members found in this group.' });

			return interaction.editReply({
				content: [
					`${msgText}\n\n${args.message ?? ''}`,
					'',
					groupMembers
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		if (args.ping_option === 'pending') {
			const pendingMembers = clan.memberList.filter((member) => !updated.members.some((m) => m.tag === member.tag));
			if (!pendingMembers.length) return interaction.editReply({ content: 'No pending members found.' });

			const members = await this.client.rosterManager.getClanMembers(pendingMembers);
			if (!members.length) return interaction.editReply({ content: 'No pending members found.' });

			return interaction.followUp({
				content: [
					`${msgText}\n\n${args.message ?? ''}`,
					'',
					members
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		if (args.ping_option === 'unwanted') {
			const unwantedMembers = updated.members.filter((member) => !member.clan || member.clan.tag !== clan.tag);
			if (!unwantedMembers.length) return interaction.editReply({ content: 'No unwanted members found.' });

			return interaction.followUp({
				content: [
					`${msgText}\n${args.message ?? ''}`,
					'',
					unwantedMembers
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		return interaction.followUp({
			content: [
				`${msgText}\n\n${args.message ?? ''}`,
				'',
				updated.members
					.map((member) => {
						return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
					})
					.join('\n')
			].join('\n')
		});
	}
}
