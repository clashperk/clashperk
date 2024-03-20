import { CommandInteraction, InteractionReplyOptions } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster } from '../../struct/RosterManager.js';
import { Settings } from '../../util/Constants.js';
import { nullsLastSortAlgo } from '../../util/Helper.js';

export default class RosterPingCommand extends Command {
	public constructor() {
		super('roster-ping', {
			category: 'roster',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'SendMessagesInThreads', 'SendMessages', 'ViewChannel'],
			roleKey: Settings.ROSTER_MANAGER_ROLE,
			description: {
				content: ['Ping members that relates to the roster.']
			},
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { roster: string; ping_option?: 'unregistered' | 'missing' | 'everyone'; group?: string; message?: string }
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

		const msgText = `\u200e**${roster.name} - ${roster.clan.name} (${roster.clan.tag})** ${args.message ? `\n\n${args.message}` : ''}`;

		if (args.group) {
			const groupMembers = updated.members.filter((member) => member.categoryId && member.categoryId.toHexString() === args.group);
			if (!groupMembers.length) return interaction.editReply({ content: 'No members found in this group.' });

			groupMembers.sort((a, b) => nullsLastSortAlgo(a.userId, b.userId));
			return this.followUp(interaction, updated, {
				content: [
					msgText,
					'',
					groupMembers
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		if (args.ping_option === 'unregistered') {
			const unregisteredMembers = clan.memberList.filter((member) => !updated.members.some((m) => m.tag === member.tag));
			if (!unregisteredMembers.length) return interaction.editReply({ content: 'No unregistered members found.' });

			const members = await this.client.rosterManager.getClanMembers(unregisteredMembers, true);
			if (!members.length) return interaction.editReply({ content: 'No unregistered members found.' });

			members.sort((a, b) => nullsLastSortAlgo(a.userId, b.userId));
			return this.followUp(interaction, updated, {
				content: [
					msgText,
					'',
					members
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		if (args.ping_option === 'missing') {
			const missingMembers = updated.members.filter((member) => !member.clan || member.clan.tag !== clan.tag);
			if (!missingMembers.length) return interaction.editReply({ content: 'No missing members found.' });

			missingMembers.sort((a, b) => nullsLastSortAlgo(a.userId, b.userId));
			return this.followUp(interaction, updated, {
				content: [
					msgText,
					'',
					missingMembers
						.map((member) => {
							return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
						})
						.join('\n')
				].join('\n')
			});
		}

		return this.followUp(interaction, updated, {
			content: [
				msgText,
				'',
				updated.members
					.map((member) => {
						return `${member.name} (${member.tag}) ${member.userId ? `<@${member.userId}>` : ''}`;
					})
					.join('\n')
			].join('\n')
		});
	}

	private async followUp(interaction: CommandInteraction<'cached'>, roster: IRoster, payload: InteractionReplyOptions) {
		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

		const embed = this.client.rosterManager.getRosterEmbed(roster, categories);
		await interaction.editReply({ embeds: [embed] });

		return interaction.followUp({ ...payload, ephemeral: this.muted });
	}
}
