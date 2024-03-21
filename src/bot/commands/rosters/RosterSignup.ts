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
			const row = this.client.rosterManager.getRosterComponents({ roster, signupDisabled: false });
			await interaction.editReply({ components: [row] });
			return interaction.followUp({ content: 'Roster is closed.', ephemeral: true });
		}

		const players = await this.client.resolver.getPlayers(interaction.user.id, 75);
		const customIds = {
			select: this.client.uuid(interaction.user.id),
			category: this.client.uuid(interaction.user.id)
		};

		const signedUp = roster.members.map((member) => member.tag);
		const linked = players
			.filter((player) => (players.length > 25 ? !signedUp.includes(player.tag) : true))
			.slice(0, 25)
			.map((player) => {
				const heroes = player.heroes.filter((hero) => hero.village === 'home');
				return {
					label: `${signedUp.includes(player.tag) ? '[SIGNED UP] ' : ''}${player.name} (${player.tag})`,
					value: player.tag,
					emoji: TOWN_HALLS[player.townHallLevel],
					description: heroes.length
						? `${heroes.map((hero) => `${this.initials(hero.name)} ${hero.level}`).join(', ')}`
						: undefined
				};
			});
		const registered = roster.members
			.filter((mem) => mem.userId === interaction.user.id)
			.slice(0, 25)
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

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
		const selectableCategories = categories.filter((category) => category.selectable);

		const selected: { category: null | string } = {
			category: null
		};

		const category = selectableCategories.find((category) => category.name === 'confirmed');
		if (category && roster.allowCategorySelection) selected.category = category._id.toHexString();

		const categoryMenu = new StringSelectMenuBuilder()
			.setMinValues(1)
			.setPlaceholder('Choose a category (confirmed, substitute, etc)')
			.setCustomId(customIds.category)
			.setOptions(
				selectableCategories.map((category) => ({
					label: category.displayName,
					value: category._id.toHexString(),
					default: selected.category === category._id.toHexString()
				}))
			);
		const categoryRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu);

		const accountsMenu = new StringSelectMenuBuilder()
			.setMinValues(1)
			.setMaxValues(options.length)
			.setPlaceholder('Select accounts!')
			.setCustomId(customIds.select)
			.setOptions(options);
		const accountsRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(accountsMenu);

		const msg = await interaction.followUp({
			content: args.signup ? 'Select the accounts you want to signup with.' : 'Select the accounts you want to remove.',
			ephemeral: true,
			components:
				args.signup && roster.allowCategorySelection && selectableCategories.length ? [categoryRow, accountsRow] : [accountsRow]
		});

		const signupUser = async (action: StringSelectMenuInteraction<'cached'>) => {
			await action.deferUpdate();

			const result = [];
			for (const tag of action.values) {
				const player = players.find((mem) => mem.tag === tag)!;
				const updated = await this.client.rosterManager.selfSignup({
					player,
					rosterId,
					user: interaction.user,
					categoryId: selected.category
				});
				result.push({
					success: updated.success,
					message: `**\u200e${player.name} (${player.tag})** ${updated.success ? '- ' : '\n'}${updated.message}`
				});
			}
			const errored = result.some((res) => !res.success);

			const roster = await this.client.rosterManager.get(rosterId);
			if (!roster) return action.editReply({ content: 'Roster was deleted.', embeds: [], components: [] });

			if (errored) {
				await action.editReply({
					content: ['**Failed to signup a few accounts!**', ...result.map((res) => res.message)].join('\n\n'),
					embeds: [],
					components: []
				});
			} else {
				await action.editReply({ content: 'You have been added to the roster.', embeds: [], components: [] });
			}

			const embed = this.client.rosterManager.getRosterEmbed(roster, categories);
			return interaction.editReply({ embeds: [embed] });
		};

		const optOutUser = async (action: StringSelectMenuInteraction<'cached'>) => {
			await action.deferUpdate();

			const updated = await this.client.rosterManager.optOut(roster, ...action.values);
			if (!updated) return action.editReply({ content: 'You are not signed up for this roster.', embeds: [], components: [] });

			await action.editReply({ content: 'You have been removed from the roster.', embeds: [], components: [] });

			const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
			return interaction.editReply({ embeds: [embed] });
		};

		const selectCategory = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.category = action.values[0];
			categoryMenu.setOptions(
				selectableCategories.map((category) => ({
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

				if (args.signup) return signupUser(action);
				return optOutUser(action);
			}
		});
	}

	private initials(str: string) {
		return str
			.split(/\s+/)
			.map((word) => word.at(0))
			.join('');
	}
}
