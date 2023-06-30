import {
	ActionRowBuilder,
	AutocompleteInteraction,
	CommandInteraction,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction
} from 'discord.js';
import { Filter, ObjectId, WithId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster, IRosterCategory } from '../../struct/RosterManager.js';
import { createInteractionCollector } from '../../util/Pagination.js';
import { Collections } from '../../util/Constants.js';
import { PlayerModel } from '../../types/index.js';

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

	public async autocomplete(
		interaction: AutocompleteInteraction<'cached'>,
		args: {
			roster: string;
			player_tag?: string;
			action?: 'add-user' | 'del-user' | 'change-roster' | 'change-category';
			target_roster?: string;
			target_group?: string;
		}
	) {
		if (!ObjectId.isValid(args.roster)) return interaction.respond([{ name: 'Invalid roster ID.', value: '0' }]);
		if (!args.action) return interaction.respond([{ name: 'No action was selected.', value: '0' }]);

		const rosterId = new ObjectId(args.roster);
		const focused = interaction.options.getFocused(true);

		if (focused.name === 'target_roster') {
			if (args.action !== 'change-roster')
				return interaction.respond([{ name: 'This option is only for changing roster.', value: '0' }]);

			const filter: Filter<IRoster> = {
				guildId: interaction.guild.id,
				_id: { $ne: rosterId }
			};

			if (args.target_roster) {
				const text = args.target_roster.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				filter.name = { $regex: `.*${text}.*`, $options: 'i' };
			}

			const cursor = this.client.rosterManager.rosters.find(filter, { projection: { members: 0 } });
			if (!args.target_roster) cursor.sort({ _id: -1 });

			const rosters = await cursor.limit(24).toArray();
			if (!rosters.length) return interaction.respond([{ value: '0', name: 'No rosters found.' }]);

			return interaction.respond(
				rosters.map((roster) => ({
					value: roster._id.toHexString(),
					name: `${roster.clan.name} - ${roster.name}`.substring(0, 100)
				}))
			);
		}

		if (focused.name === 'target_group') {
			if (!args.player_tag) {
				return interaction.respond([{ name: 'Player tag is not selected.', value: '0' }]);
			}

			const roster = await this.client.rosterManager.get(rosterId);
			if (!roster) return interaction.respond([{ name: 'Roster was deleted.', value: '0' }]);

			const filter: Filter<IRosterCategory> = {
				guildId: interaction.guild.id
			};

			const categoryId = roster.members.find((member) => member.tag === this.client.http.parseTag(args.player_tag!))?.categoryId;
			if (categoryId && args.action === 'change-category') filter._id = { $ne: categoryId };

			if (args.target_group) {
				const text = args.target_group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				filter.displayName = { $regex: `.*${text}.*`, $options: 'i' };
			}

			const cursor = this.client.rosterManager.categories.find(filter);
			if (!args.target_group) cursor.sort({ _id: -1 });

			const categories = await cursor.limit(24).toArray();
			if (!categories.length) return interaction.respond([{ value: '0', name: 'No categories found.' }]);

			return interaction.respond(
				categories.map((category) => ({
					value: category._id.toHexString(),
					name: `${category.displayName}`.substring(0, 100)
				}))
			);
		}

		if (['del-user', 'change-category', 'change-roster'].includes(args.action) && args.roster) {
			const roster = await this.client.rosterManager.get(rosterId);
			if (!roster) return interaction.respond([{ name: 'Roster was deleted.', value: '0' }]);

			const choices = roster.members
				.map((member) => ({
					query: `${member.name} ${member.tag} ${member.username ?? ''} ${member.userId ?? ''}`,
					name: `${member.name} (${member.tag})`,
					value: member.tag
				}))
				.filter((member) => {
					if (!args.player_tag) return true;
					const query = args.player_tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					return new RegExp(`.*${query}.*`, 'i').test(`${member.query}`);
				})
				.map((member) => ({
					name: member.name,
					value: member.value
				}))
				.slice(0, 24);
			return interaction.respond(choices);
		}

		const [clans, roster] = await Promise.all([
			this.client.storage.find(interaction.guild.id),
			this.client.rosterManager.get(rosterId)
		]);
		if (!roster) return interaction.respond([{ name: 'Roster was deleted.', value: '0' }]);

		const query: Filter<PlayerModel> = {
			'clan.tag': { $in: clans.map((clan) => clan.tag) }
		};

		if (roster.members.length) {
			// query.tag = { $nin: roster.members.map((member) => member.tag) };
		}

		if (args.player_tag) {
			const text = args.player_tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			query.$or = [{ name: { $regex: `.*${text}.*`, $options: 'i' } }, { tag: { $regex: `.*${text}.*`, $options: 'i' } }];
		}

		const signedUp = roster.members.map((member) => member.tag);
		const cursor = this.client.db.collection<PlayerModel>(Collections.LAST_SEEN).find(query, { projection: { name: 1, tag: 1 } });
		if (!args.player_tag) cursor.sort({ lastSeen: -1 });
		const players = await cursor.limit(24).toArray();
		if (!players.length) return interaction.respond([{ name: 'No players found.', value: '0' }]);

		const choices = players.map((player) => ({
			name: `${signedUp.includes(player.tag) ? '[SIGNED UP] ' : ''}${player.name} (${player.tag})`,
			value: player.tag
		}));
		return interaction.respond(choices);
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			roster: string;
			signup: boolean;
			player_tag: string;
			target_group?: string;
			target_roster?: string;
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

			const updated = await this.client.rosterManager.signup(interaction, rosterId, player, user, args.target_group);
			if (!updated) return null;

			return interaction.editReply({ content: 'User added successfully.' });
		}

		if (args.action === 'change-roster') {
			if (!args.target_roster) return this.changeRoster(interaction, roster, args.player_tag);

			if (!ObjectId.isValid(args.target_roster)) return interaction.editReply({ content: 'Invalid target roster ID.' });
			const newRosterId = new ObjectId(args.target_roster);

			if (args.target_group && !ObjectId.isValid(args.target_group)) {
				return interaction.editReply({ content: 'Invalid target group ID.' });
			}

			const rosterMember = roster.members.find((member) => member.tag === this.client.http.parseTag(args.player_tag));
			if (!rosterMember) return interaction.editReply({ content: 'User not found in roster.' });

			const newGroupId = args.target_group
				? new ObjectId(args.target_group).toHexString()
				: rosterMember.categoryId
				? rosterMember.categoryId.toHexString()
				: null;

			if (roster._id.toHexString() === args.target_roster) {
				return interaction.editReply({ content: 'You cannot move a user to the same roster.' });
			}

			const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
			if (!player) return;

			const user = await this.client.resolver.getUser(args.player_tag);
			await this.client.rosterManager.swapRoster(interaction, roster._id, player, user, newRosterId, newGroupId);

			return interaction.editReply({ content: 'User moved to the new roster.', components: [] });
		}

		if (args.action === 'change-category') {
			if (!args.target_group) return this.changeCategory(interaction, roster, args.player_tag);

			const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
			if (!player) return;

			const user = await this.client.resolver.getUser(args.player_tag);
			await this.client.rosterManager.swapCategory(roster._id, player, user, new ObjectId(args.target_group));

			return interaction.editReply({ content: 'User moved to the new group.', components: [] });
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
				categories.slice(0, 25).map((category) => ({
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
				rosters.slice(0, 25).map((roster) => ({
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
