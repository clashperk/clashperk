import { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import { ObjectId, WithId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster } from '../../struct/RosterManager.js';
import { createInteractionCollector } from '../../util/Pagination.js';

export default class RosterManageCommand extends Command {
	public constructor() {
		super('roster-manage', {
			category: 'roster',
			channel: 'guild',
			description: {
				content: ['Create, delete, edit or view rosters.']
			},
			userPermissions: ['ManageGuild'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			roster: string;
			signup: boolean;
			player_tag: string;
			group?: string;
			action: 'add-user' | 'del-user' | 'change-roster' | 'change-category' | '/';
		}
	) {
		if (!ObjectId.isValid(args.roster)) return interaction.editReply({ content: 'Invalid roster ID.' });

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.editReply({ content: 'Roster was deleted.' });

		if (args.action === 'del-user') {
			const updated = await this.client.rosterManager.optOut(rosterId, args.player_tag);
			if (!updated) return interaction.editReply({ content: 'Roster was deleted.' });

			return interaction.editReply({ content: 'User removed successfully.' });
		}

		if (args.action === 'add-user') {
			const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
			if (!player) return;

			const user = await this.client.resolver.getUser(args.player_tag);

			const updated = await this.client.rosterManager.signup(interaction, rosterId, player, user, args.group);
			if (!updated) return null;

			return interaction.editReply({ content: 'User added successfully.' });
		}

		if (args.action === 'change-roster') {
			return this.changeRoster(interaction, roster, args.player_tag);
		}
		if (args.action === 'change-category') {
			return this.changeCategory(interaction, roster, args.player_tag);
		}
	}

	private async changeCategory(interaction: CommandInteraction<'cached'>, roster: WithId<IRoster>, playerTag: string) {
		const customIds = {
			select: this.client.uuid(interaction.user.id)
		};
		const selected = {
			categoryId: null as null | string
		};

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
		if (!categories.length) return interaction.editReply({ content: 'No categories found.' });

		const categoryMenu = new StringSelectMenuBuilder()
			.setMinValues(1)
			.setPlaceholder('Choose new category')
			.setCustomId(customIds.select)
			.setOptions(
				categories.map((category) => ({
					label: category.displayName,
					value: category._id.toHexString(),
					default: selected.categoryId === category._id.toHexString()
				}))
			);
		const categoryRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu);

		const message = await interaction.editReply({
			components: [categoryRow],
			content: 'Select the group you want to move this user to.'
		});

		const selectCategory = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.categoryId = action.values[0];
			await action.deferUpdate();

			const player = await this.client.resolver.resolvePlayer(interaction, playerTag);
			if (!player) return;

			const user = await this.client.resolver.getUser(playerTag);
			await this.client.rosterManager.swapCategory(roster._id, player, user, new ObjectId(selected.categoryId));

			return action.editReply({ content: 'User moved successfully.', components: [] });
		};

		createInteractionCollector({
			interaction,
			customIds,
			message,
			onSelect: (action) => selectCategory(action)
		});
	}

	private async changeRoster(interaction: CommandInteraction<'cached'>, roster: WithId<IRoster>, playerTag: string) {
		const customIds = {
			select: this.client.uuid(interaction.user.id)
		};
		const selected = {
			rosterId: null as null | string
		};

		const rosters = await this.client.rosterManager.list(interaction.guild.id);
		if (!rosters.length) return interaction.editReply({ content: 'No rosters found.' });

		const rosterMenu = new StringSelectMenuBuilder()
			.setMinValues(1)
			.setPlaceholder('Choose new roster')
			.setCustomId(customIds.select)
			.setOptions(
				rosters.map((roster) => ({
					label: roster.name,
					description: `${roster.clan.name} (${roster.clan.tag})`,
					value: roster._id.toHexString(),
					default: selected.rosterId === roster._id.toHexString()
				}))
			);
		const rosterRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rosterMenu);

		const message = await interaction.editReply({
			components: [rosterRow],
			content: 'Select the roster you want to move this user to.'
		});

		const selectRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.rosterId = action.values[0];
			if (roster._id.toHexString() === selected.rosterId) {
				return action.reply({ content: 'You cannot move a user to the same roster.', ephemeral: true });
			}

			await action.deferUpdate();

			const player = await this.client.resolver.resolvePlayer(interaction, playerTag);
			if (!player) return;

			const user = await this.client.resolver.getUser(playerTag);
			await this.client.rosterManager.swapRoster(action, roster._id, player, user, new ObjectId(selected.rosterId), null);

			return action.editReply({ content: 'User moved successfully.', components: [] });
		};

		createInteractionCollector({
			interaction,
			customIds,
			message,
			onSelect: (action) => selectRoster(action)
		});
	}
}
