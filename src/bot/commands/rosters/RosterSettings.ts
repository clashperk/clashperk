import { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { getExportComponents } from '../../util/Helper.js';
import { createInteractionCollector } from '../../util/Pagination.js';

export default class RosterEditCommand extends Command {
	public constructor() {
		super('roster-settings', {
			category: 'roster',
			channel: 'guild',
			description: {
				content: ['Create, delete, edit or view rosters.']
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { roster: string }) {
		if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster was deleted.', ephemeral: true });

		const customIds = {
			select: this.client.uuid(interaction.user.id)
		};

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setMinValues(1)
				.setPlaceholder('Select an option!')
				.setCustomId(customIds.select)
				.setOptions([
					{
						label: 'Roster Info/Export',
						description: 'View roster info, settings and Export to Google spreadsheet.',
						value: 'export'
					},
					{
						label: 'Close Roster',
						description: 'Prevent new signups to the roster.',
						value: 'close'
					},
					{
						label: 'Open Roster',
						description: 'Allow new signups to the roster.',
						value: 'open'
					},
					{
						label: 'Clear Roster',
						description: 'Remove all members from the roster.',
						value: 'clear'
					},
					{
						label: 'Remove Buttons',
						description: 'Remove action buttons from the message.',
						value: 'archive'
					}
				])
		);

		const message = await interaction.followUp({ components: [menuRow], ephemeral: true });
		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

		const closeRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
			const updated = await this.client.rosterManager.close(rosterId);
			if (!updated) return action.reply({ content: 'Roster was deleted.', ephemeral: true });
			await action.update({ content: 'Roster closed!', components: [] });

			const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
			const row = this.client.rosterManager.getRosterComponents({ roster: updated });
			return interaction.editReply({ embeds: [embed], components: [row] });
		};

		const openRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
			if (roster.endTime && new Date(roster.endTime) < new Date()) {
				return action.reply({ content: 'This roster cannot be opened as the closing time has passed.', ephemeral: true });
			}

			if (!roster.allowMultiSignup && roster.members.length > 0 && roster.closed) {
				const dup = await this.client.rosterManager.rosters.findOne(
					{
						'_id': { $ne: roster._id },
						'closed': false,
						'guildId': action.guild.id,
						'members.tag': { $in: roster.members.map((mem) => mem.tag) }
					},
					{ projection: { members: 0 } }
				);

				if (dup)
					return action.reply(
						`This roster has multiple members signed up for another roster **${dup.clan.name} - ${dup.name}**. Please remove them before opening this roster.`
					);
			}

			const updated = await this.client.rosterManager.open(rosterId);
			if (!updated) return action.reply({ content: 'Roster was deleted.', ephemeral: true });
			await action.update({ content: 'Roster opened!', components: [] });

			const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
			const row = this.client.rosterManager.getRosterComponents({ roster: updated });
			return interaction.editReply({ embeds: [embed], components: [row] });
		};

		const clearRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
			const updated = await this.client.rosterManager.clear(rosterId);
			if (!updated) return action.reply({ content: 'Roster was deleted.', ephemeral: true });

			await action.update({ content: 'Roster cleared!', components: [] });

			const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
			const row = this.client.rosterManager.getRosterComponents({ roster: updated });
			return interaction.editReply({ embeds: [embed], components: [row] });
		};

		const archiveRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
			const embed = this.client.rosterManager.getRosterEmbed(roster, categories);
			await interaction.editReply({ embeds: [embed], components: [] });
			await action.update({ content: 'Roster buttons removed!', components: [] });

			const clan = await this.client.http.clan(roster.clan.tag);
			if (!clan.ok) return null;

			const sheet = await this.client.rosterManager.exportSheet({
				name: interaction.guild.name,
				roster,
				clan,
				categories
			});

			const components = getExportComponents(sheet);
			return interaction.editReply({ embeds: [embed], components: [...components] });
		};

		const exportSheet = async (action: StringSelectMenuInteraction<'cached'>) => {
			if (!roster.members.length) return action.reply({ content: 'Roster is empty.', ephemeral: true });

			const embed = this.client.rosterManager.getRosterInfoEmbed(roster);
			await action.update({ content: `## Updating spreadsheet... ${EMOJIS.LOADING}`, embeds: [embed], components: [] });

			const clan = await this.client.http.clan(roster.clan.tag);
			if (!clan.ok) return action.reply({ content: `Failed to fetch the clan \u200e${roster.clan.name} (${roster.clan.tag})` });

			const sheet = await this.client.rosterManager.exportSheet({
				name: interaction.guild.name,
				roster,
				clan,
				categories
			});

			const components = getExportComponents(sheet);
			return action.editReply({ content: null, embeds: [embed], components: [...components] });
		};

		createInteractionCollector({
			interaction,
			customIds,
			message,
			onSelect: (action) => {
				const value = action.values.at(0)!;

				if (!this.client.util.isManager(action.member) && !['export'].includes(value)) {
					return action.reply({
						ephemeral: true,
						content: `You are missing the **Manage Server** permission or the **Bot Manager** role to perform this action.`
					});
				}

				switch (value) {
					case 'close':
						return closeRoster(action);
					case 'open':
						return openRoster(action);
					case 'clear':
						return clearRoster(action);
					case 'archive':
						return archiveRoster(action);
					case 'export':
						return exportSheet(action);
				}
			}
		});
	}
}
