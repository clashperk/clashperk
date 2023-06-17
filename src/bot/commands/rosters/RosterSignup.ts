import { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { TOWN_HALLS } from '../../util/Emojis.js';
import { createInteractionCollector } from '../../util/Pagination.js';

export default class RosterSignupCommand extends Command {
	public constructor() {
		super('roster-signup', {
			category: 'roster',
			channel: 'guild',
			description: {
				content: ['Create, delete, edit or view rosters.']
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { roster: string; signup: boolean }) {
		if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster was deleted.', ephemeral: true });

		const isClosed = this.client.rosterManager.isClosed(roster);
		if (isClosed) {
			const row = this.client.rosterManager.getRosterComponents({ roster });
			await interaction.editReply({ components: [row] });
			return interaction.followUp({ content: 'Roster is closed.', ephemeral: true });
		}

		const players = await this.client.resolver.getPlayers(interaction.user.id);
		const customIds = {
			select: this.client.uuid(interaction.user.id),
			category: this.client.uuid(interaction.user.id)
		};

		const signedUp = roster.members.map((member) => member.tag);
		const linked = players.map((player) => {
			const heroes = player.heroes.filter((hero) => hero.village === 'home');
			return {
				label: `${signedUp.includes(player.tag) ? '[SIGNED UP] ' : ''}${player.name} (${player.tag})`,
				value: player.tag,
				emoji: TOWN_HALLS[player.townHallLevel],
				description: heroes.length ? `${heroes.map((hero) => `${this.initials(hero.name)} ${hero.level}`).join(', ')}` : undefined
			};
		});
		const registered = roster.members
			.filter((mem) => mem.userId === interaction.user.id)
			.map((mem) => ({
				label: `${mem.name} (${mem.tag})`,
				value: mem.tag,
				emoji: TOWN_HALLS[mem.townHallLevel]
			}));
		const options = args.signup ? linked : registered;

		if (!linked.length && args.signup) {
			return interaction.followUp({ content: 'You are not linked to any players.', ephemeral: true });
		}

		if (!registered.length && !args.signup) {
			return interaction.followUp({ content: 'You are not signed up for this roster.', ephemeral: true });
		}

		const selected = {
			category: null as null | string,
			tag: ''
		};

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
		const categoryMenu = new StringSelectMenuBuilder()
			.setMinValues(1)
			.setPlaceholder('Choose a category (confirmed, substitute, etc)')
			.setCustomId(customIds.category)
			.setOptions(
				categories.map((category) => ({
					label: category.displayName,
					value: category._id.toHexString(),
					default: selected.category === category._id.toHexString()
				}))
			);
		const categoryRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu);
		const accountsRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setMinValues(1)
				.setPlaceholder('Select an account!')
				.setCustomId(customIds.select)
				.setOptions(options)
		);

		const msg = await interaction.followUp({
			content: args.signup ? 'Select the accounts you want to sign up with.' : 'Select the accounts you want to remove.',
			ephemeral: true,
			components: args.signup && roster.allowCategorySelection && categories.length ? [categoryRow, accountsRow] : [accountsRow]
		});

		const addItem = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.tag = action.values[0];
			const player = players.find((mem) => mem.tag === selected.tag)!;

			await action.deferUpdate();
			const updated = await this.client.rosterManager.signup(action, rosterId, player, interaction.user, selected.category);
			if (!updated) return null;

			await action.editReply({ content: 'You have been signed up.', embeds: [], components: [] });

			const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
			return interaction.editReply({ embeds: [embed] });
		};

		const deleteItem = async (action: StringSelectMenuInteraction<'cached'>) => {
			const tag = action.values[0];
			await action.deferUpdate();

			const updated = await this.client.rosterManager.optOut(rosterId, tag);
			if (!updated) return null;

			await action.editReply({ content: 'You have been removed.', embeds: [], components: [] });

			const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
			return interaction.editReply({ embeds: [embed] });
		};

		const selectCategory = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.category = action.values[0];
			categoryMenu.setOptions(
				categories.map((category) => ({
					label: category.displayName,
					value: category._id.toHexString(),
					default: selected.category === category._id.toHexString()
				}))
			);
			await action.update({ content: msg.content, components: [categoryRow, accountsRow] });
		};

		createInteractionCollector({
			interaction,
			customIds,
			message: msg,
			onSelect: (action) => {
				if (action.customId === customIds.category) {
					return selectCategory(action);
				}

				if (args.signup) return addItem(action);
				return deleteItem(action);
			}
		});
	}

	private initials(str: string) {
		return str
			.split(/\s+/)
			.map((word) => word[0])
			.join('');
	}
}
