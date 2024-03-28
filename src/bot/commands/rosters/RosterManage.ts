import { APIClan } from 'clashofclans.js';
import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	DiscordjsError,
	DiscordjsErrorCodes,
	ModalBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	TextInputBuilder,
	TextInputStyle,
	User,
	UserSelectMenuBuilder,
	UserSelectMenuInteraction
} from 'discord.js';
import { Filter, ObjectId, WithId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster, IRosterCategory, PlayerWithLink } from '../../struct/RosterManager.js';
import { PlayerModel } from '../../types/index.js';
import { Collections, Settings, TAG_REGEX } from '../../util/Constants.js';
import { createInteractionCollector } from '../../util/Pagination.js';
import { Util } from '../../util/index.js';

export default class RosterManageCommand extends Command {
	public constructor() {
		super('roster-manage', {
			category: 'roster',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			roleKey: Settings.ROSTER_MANAGER_ROLE,
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
					name: `${roster.clan.name} - ${roster.name}`.slice(0, 100)
				}))
			);
		}

		if (focused.name === 'target_group') {
			const roster = await this.client.rosterManager.get(rosterId);
			if (!roster) return interaction.respond([{ name: 'Roster was deleted.', value: '0' }]);

			const filter: Filter<IRosterCategory> = {
				guildId: interaction.guild.id
			};

			const playerTag = args.player_tag ? this.client.http.fixTag(args.player_tag) : null;

			const categoryId = roster.members.find((member) => member.tag === playerTag)?.categoryId;
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
					name: `${category.displayName}`.slice(0, 100)
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
			player_tag?: string;
			clan_tag?: string;
			user?: User;
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
			if (!args.player_tag) {
				return this.delUsers(interaction, { roster, user: args.user });
			}

			const updated = await this.client.rosterManager.optOut(roster, args.player_tag);
			if (!updated) return interaction.editReply({ content: 'Roster was deleted.' });

			return interaction.editReply({ content: 'Player removed successfully.' });
		}

		if (args.action === 'add-user') {
			if (args.clan_tag) {
				const clan = await this.client.resolver.resolveClan(interaction, args.clan_tag);
				if (!clan) return;
				return this.addUsers(interaction, { roster, clan, categoryId: args.target_group });
			}

			if (!args.player_tag) {
				return this.addUsers(interaction, { roster, user: args.user, categoryId: args.target_group });
			}

			const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
			if (!player) return;
			const user = await this.client.resolver.getUser(player.tag);

			const updated = await this.client.rosterManager.signup({
				interaction,
				player,
				rosterId,
				user,
				categoryId: args.target_group
			});
			if (!updated) return null;

			return interaction.editReply({ content: 'User added successfully.' });
		}

		if (args.action === 'change-roster') {
			if (!args.player_tag || !args.target_roster) {
				return this.changeRoster(interaction, {
					roster,
					playerTag: args.player_tag,
					user: args.user,
					rosterId: args.target_roster,
					categoryId: args.target_group
				});
			}
			const playerTag = this.client.http.fixTag(args.player_tag);

			if (!ObjectId.isValid(args.target_roster)) return interaction.editReply({ content: 'Invalid target roster ID.' });
			const newRosterId = new ObjectId(args.target_roster);

			if (args.target_group && !ObjectId.isValid(args.target_group)) {
				return interaction.editReply({ content: 'Invalid target group ID.' });
			}

			const rosterMember = roster.members.find((member) => member.tag === playerTag);
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

			const swapped = await this.client.rosterManager.swapRoster({
				oldRoster: roster,
				player,
				user,
				newRosterId,
				categoryId: newGroupId
			});
			if (!swapped.success) return interaction.editReply({ content: swapped.message });

			return interaction.editReply({ content: 'Players moved to the new roster.', components: [] });
		}

		if (args.action === 'change-category') {
			if (!args.player_tag || !args.target_group) {
				return this.changeCategory(interaction, {
					roster,
					playerTag: args.player_tag,
					categoryId: args.target_group,
					user: args.user
				});
			}
			const playerTag = this.client.http.fixTag(args.player_tag);

			const player = await this.client.resolver.resolvePlayer(interaction, playerTag);
			if (!player) return;

			const user = await this.client.resolver.getUser(playerTag);
			const swapped = await this.client.rosterManager.swapCategory({
				roster,
				player,
				user,
				newCategoryId: new ObjectId(args.target_group)
			});
			if (!swapped) return null;

			return interaction.editReply({ content: 'Players moved to the new user group.', components: [] });
		}
	}

	private async changeCategory(
		interaction: CommandInteraction<'cached'>,
		{ roster, playerTag, user, categoryId }: { roster: WithId<IRoster>; playerTag?: string; user?: User; categoryId?: string }
	) {
		if (categoryId && !ObjectId.isValid(categoryId)) return interaction.editReply({ content: 'Invalid target group ID.' });

		const playerCustomIds: Record<string, string> = {
			0: this.client.uuid(interaction.user.id),
			1: this.client.uuid(interaction.user.id),
			2: this.client.uuid(interaction.user.id)
		};
		const customIds = {
			category: this.client.uuid(interaction.user.id),
			categorySelect: this.client.uuid(interaction.user.id),
			confirm: this.client.uuid(interaction.user.id),
			deselect: this.client.uuid(interaction.user.id),
			user: this.client.uuid(interaction.user.id),
			...playerCustomIds
		};

		const selected = {
			categoryId: null as null | string,
			user: null as null | User,
			userIds: [] as string[],
			playerTags: [] as string[],
			targetCategory: null as null | WithId<IRosterCategory>
		};
		if (playerTag) selected.playerTags.push(playerTag);
		if (user) {
			selected.user = user;
			selected.userIds.push(user.id);
		}
		if (categoryId) {
			selected.categoryId = categoryId;
			selected.targetCategory = await this.client.rosterManager.getCategory(new ObjectId(categoryId));
		}

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
		if (!categories.length) return interaction.editReply({ content: 'No user groups found.' });

		const maxItems = 25;
		const getOptions = () => {
			const filtered = selected.userIds.length
				? roster.members.filter((mem) => mem.userId && selected.userIds.includes(mem.userId))
				: roster.members;

			if (selected.userIds.length) {
				const filteredTags = filtered.map((op) => op.tag);
				selected.playerTags = selected.playerTags.filter((tag) => filteredTags.includes(tag));
			}

			const options = filtered
				.map((player) => ({
					label: `${player.name} (${player.tag})`,
					value: player.tag
				}))
				.map((player) => ({
					...player,
					default: selected.playerTags.includes(player.value)
				}));
			return options.slice(0, 75);
		};

		const playerRows = () => {
			const _playerRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
			const options = getOptions();
			const chunks = Util.chunk(options, maxItems);

			chunks.forEach((chunk, i) => {
				const playerMenu = new StringSelectMenuBuilder()
					.setMinValues(1)
					.setMaxValues(chunk.length)
					.setCustomId(playerCustomIds[i])
					.setOptions(chunk);

				if (options.length > 25) {
					playerMenu.setPlaceholder(`Select Players [${maxItems * i + 1} - ${maxItems * (i + 1)}]`);
				} else {
					playerMenu.setPlaceholder('Select Players');
				}

				const playerRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(playerMenu);
				_playerRows.push(playerRow);
			});
			return _playerRows;
		};

		const userMenu = new UserSelectMenuBuilder().setCustomId(customIds.user).setPlaceholder('Select User').setMinValues(0);
		const userRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userMenu);

		const confirmButton = new ButtonBuilder()
			.setLabel('Confirm')
			.setCustomId(customIds.confirm)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(!(selected.playerTags.length && selected.targetCategory));

		const deselectButton = new ButtonBuilder()
			.setLabel('Deselect')
			.setCustomId(customIds.deselect)
			.setStyle(ButtonStyle.Danger)
			.setDisabled(false);

		const categorySelectButton = new ButtonBuilder()
			.setLabel('Select Group')
			.setCustomId(customIds.category)
			.setStyle(ButtonStyle.Secondary);

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, categorySelectButton, deselectButton);

		const headerTexts = [
			'**Changing User Group**',
			'',
			'- Select the **user** or **players** you want to move to the new user group.',
			'- Click the button below to confirm.'
		];

		const getTexts = () => {
			const options = getOptions();
			let messageTexts = [...headerTexts, ''];

			if (selected.targetCategory) {
				messageTexts = [...messageTexts, '- Group selected:', `  - **\u200e${selected.targetCategory.displayName}**`];
			}

			if (selected.user) {
				messageTexts = [
					...messageTexts,
					'- User selected:',
					`  - **\u200e${selected.user.displayName} (${selected.user.id})**`,
					`  - ${options.length} ${Util.plural(options.length, 'player')} for addition.`
				];
			}

			const players = roster.members.filter((member) => selected.playerTags.includes(member.tag));
			if (players.length) {
				messageTexts = [
					...messageTexts,
					`- Players selected: ${selected.playerTags.length}`,
					players.map((player) => `  - ${player.name} (${player.tag})`).join('\n')
				];
			}

			return messageTexts;
		};

		const messageTexts = getTexts();
		const message = await interaction.editReply({
			components: [userRow, ...playerRows(), buttonRow],
			content: messageTexts.join('\n')
		});

		const confirm = async (action: ButtonInteraction<'cached'>) => {
			await action.deferUpdate();
			const players = await this.client.rosterManager.getClanMemberLinks(
				selected.playerTags.map((tag) => ({ tag })),
				true
			);

			for (const player of players) {
				await this.client.rosterManager.swapCategory({
					roster,
					player,
					user: player.user,
					newCategoryId: selected.targetCategory?._id ?? null
				});
			}

			return action.editReply({ content: 'Players moved successfully.', components: [] });
		};

		const deselect = async (action: ButtonInteraction<'cached'>) => {
			selected.playerTags = [];
			selected.userIds = [];
			selected.user = null;
			selected.categoryId = null;
			selected.targetCategory = null;
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetCategory));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const selectUser = async (action: UserSelectMenuInteraction<'cached'>) => {
			selected.userIds = action.values;
			selected.user = action.users.first() ?? null;

			const _playerRows = playerRows();
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetCategory));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ..._playerRows, buttonRow], content: messageTexts.join('\n') });
		};

		const playerTagsMap: Record<string, string[]> = {};
		const selectPlayers = async (action: StringSelectMenuInteraction<'cached'>) => {
			playerTagsMap[action.customId] = action.values;
			selected.playerTags = Object.values(playerTagsMap).flat();
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetCategory));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const chooseCategory = async (action: ButtonInteraction<'cached'>) => {
			const rosterMenu = new StringSelectMenuBuilder()
				.setMinValues(1)
				.setPlaceholder('Select Group')
				.setCustomId(customIds.categorySelect)
				.setOptions(
					categories.slice(0, 25).map((category) => ({
						label: category.displayName,
						value: category._id.toHexString(),
						default: selected.categoryId === category._id.toHexString()
					}))
				);
			const rosterMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rosterMenu);

			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetCategory));
			return action.update({ components: [rosterMenuRow, buttonRow] });
		};

		const selectCategory = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.categoryId = action.values.at(0)!;

			const target = await this.client.rosterManager.getCategory(new ObjectId(selected.categoryId));
			if (!target) return action.reply({ content: 'Target group was deleted.', ephemeral: true });

			selected.targetCategory = target;
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetCategory));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		createInteractionCollector({
			interaction,
			customIds,
			message,
			onClick: (action) => {
				if (action.customId === customIds.deselect) return deselect(action);
				if (action.customId === customIds.confirm) return confirm(action);
				if (action.customId === customIds.category) return chooseCategory(action);
			},
			onSelect: (action) => {
				if (action.customId === customIds.categorySelect) return selectCategory(action);
				if (Object.values(playerCustomIds).includes(action.customId)) return selectPlayers(action);
			},
			onUserSelect(interaction) {
				if (interaction.customId === customIds.user) return selectUser(interaction);
			}
		});
	}

	private async changeRoster(
		interaction: CommandInteraction<'cached'>,
		{
			roster,
			playerTag,
			user,
			categoryId,
			rosterId
		}: { roster: WithId<IRoster>; playerTag?: string; user?: User; categoryId?: string; rosterId?: string }
	) {
		if (rosterId && !ObjectId.isValid(rosterId)) return interaction.editReply({ content: 'Invalid target roster ID.' });
		if (categoryId && !ObjectId.isValid(categoryId)) return interaction.editReply({ content: 'Invalid target group ID.' });

		const playerCustomIds: Record<string, string> = {
			0: this.client.uuid(interaction.user.id),
			1: this.client.uuid(interaction.user.id),
			2: this.client.uuid(interaction.user.id)
		};
		const customIds = {
			roster: this.client.uuid(interaction.user.id),
			category: this.client.uuid(interaction.user.id),
			rosterSelect: this.client.uuid(interaction.user.id),
			categorySelect: this.client.uuid(interaction.user.id),
			confirm: this.client.uuid(interaction.user.id),
			deselect: this.client.uuid(interaction.user.id),
			user: this.client.uuid(interaction.user.id),
			...playerCustomIds
		};

		const selected = {
			rosterId: null as null | string,
			categoryId: null as null | string,
			user: null as null | User,
			userIds: [] as string[],
			playerTags: [] as string[],
			targetRoster: null as null | WithId<IRoster>,
			targetCategory: null as null | WithId<IRosterCategory>
		};
		if (playerTag) selected.playerTags.push(playerTag);
		if (user) {
			selected.user = user;
			selected.userIds.push(user.id);
		}
		if (categoryId) {
			selected.categoryId = categoryId;
			selected.targetCategory = await this.client.rosterManager.getCategory(new ObjectId(categoryId));
		}
		if (rosterId) {
			selected.rosterId = rosterId;
			selected.targetRoster = await this.client.rosterManager.get(new ObjectId(rosterId));
		}

		const rosters = await this.client.rosterManager.query({ guildId: interaction.guild.id, _id: { $ne: roster._id }, closed: false });
		if (!rosters.length) return interaction.editReply({ content: 'No rosters found.', components: [] });

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

		const maxItems = 25;
		const getOptions = () => {
			const filtered = selected.userIds.length
				? roster.members.filter((mem) => mem.userId && selected.userIds.includes(mem.userId))
				: roster.members;

			if (selected.userIds.length) {
				const filteredTags = filtered.map((op) => op.tag);
				selected.playerTags = selected.playerTags.filter((tag) => filteredTags.includes(tag));
			}

			const options = filtered
				.map((player) => ({
					label: `${player.name} (${player.tag})`,
					value: player.tag
				}))
				.map((player) => ({
					...player,
					default: selected.playerTags.includes(player.value)
				}));
			return options.slice(0, 75);
		};

		const playerRows = () => {
			const _playerRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
			const options = getOptions();
			const chunks = Util.chunk(options, maxItems);

			chunks.forEach((chunk, i) => {
				const playerMenu = new StringSelectMenuBuilder()
					.setMinValues(1)
					.setMaxValues(chunk.length)
					.setCustomId(playerCustomIds[i])
					.setOptions(chunk);

				if (options.length > 25) {
					playerMenu.setPlaceholder(`Select Players [${maxItems * i + 1} - ${maxItems * (i + 1)}]`);
				} else {
					playerMenu.setPlaceholder('Select Players');
				}

				const playerRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(playerMenu);
				_playerRows.push(playerRow);
			});
			return _playerRows;
		};

		const userMenu = new UserSelectMenuBuilder().setCustomId(customIds.user).setPlaceholder('Select User').setMinValues(0);
		const userRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userMenu);

		const confirmButton = new ButtonBuilder()
			.setLabel('Confirm')
			.setCustomId(customIds.confirm)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(!(selected.playerTags.length && selected.targetRoster));

		const deselectButton = new ButtonBuilder()
			.setLabel('Deselect')
			.setCustomId(customIds.deselect)
			.setStyle(ButtonStyle.Danger)
			.setDisabled(false);

		const rosterSelectButton = new ButtonBuilder()
			.setLabel('Select Roster')
			.setCustomId(customIds.roster)
			.setStyle(ButtonStyle.Secondary);

		const categorySelectButton = new ButtonBuilder()
			.setLabel('Select Group')
			.setCustomId(customIds.category)
			.setStyle(ButtonStyle.Secondary);

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, rosterSelectButton);
		if (categories.length) buttonRow.addComponents(categorySelectButton);
		buttonRow.addComponents(deselectButton);

		const headerTexts = [
			'**Moving Roster Users**',
			'',
			'- Select the **user** or **players** you want to move to the new roster.',
			'- Click the button below to confirm.'
		];

		const getTexts = () => {
			const options = getOptions();
			let messageTexts = [...headerTexts, ''];
			if (selected.targetRoster) {
				messageTexts = [
					...messageTexts,
					'- Roster selected:',
					`  - **\u200e${selected.targetRoster.clan.name} - ${selected.targetRoster.name}**`
				];
			}

			if (selected.targetCategory) {
				messageTexts = [...messageTexts, '- Group selected:', `  - **\u200e${selected.targetCategory.displayName}**`];
			}

			if (selected.user) {
				messageTexts = [
					...messageTexts,
					'- User selected:',
					`  - **\u200e${selected.user.displayName} (${selected.user.id})**`,
					`  - ${options.length} ${Util.plural(options.length, 'player')} for addition.`
				];
			}

			const players = roster.members.filter((member) => selected.playerTags.includes(member.tag));
			if (players.length) {
				messageTexts = [
					...messageTexts,
					`- Players selected: ${selected.playerTags.length}`,
					players.map((player) => `  - ${player.name} (${player.tag})`).join('\n')
				];
			}

			return messageTexts;
		};

		const messageTexts = getTexts();
		const message = await interaction.editReply({
			components: [userRow, ...playerRows(), buttonRow],
			content: messageTexts.join('\n')
		});

		const confirm = async (action: ButtonInteraction<'cached'>) => {
			await action.deferUpdate();
			const players = await this.client.rosterManager.getClanMemberLinks(
				selected.playerTags.map((tag) => ({ tag })),
				true
			);
			const result = [];

			for (const player of players) {
				const swapped = await this.client.rosterManager.swapRoster({
					oldRoster: roster,
					player,
					user: player.user ?? null,
					newRosterId: new ObjectId(selected.rosterId!),
					categoryId: selected.targetCategory?._id.toHexString() ?? null
				});
				result.push({
					success: swapped.success,
					message: `- **\u200e${player.name} (${player.tag})** \n  - ${swapped.message}`
				});
			}

			const errored = result.some((res) => !res.success);
			if (errored) {
				const content = [
					'**Failed to move a few accounts!**',
					...result.filter((res) => !res.success).map((res) => res.message)
				].join('\n');
				return action.editReply({ content, embeds: [], components: [] });
			}
			return action.editReply({ content: 'Players moved successfully.', components: [] });
		};

		const deselect = async (action: ButtonInteraction<'cached'>) => {
			selected.playerTags = [];
			selected.userIds = [];
			selected.user = null;
			selected.categoryId = null;
			selected.rosterId = null;
			selected.targetCategory = null;
			selected.targetRoster = null;
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetRoster));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const selectUser = async (action: UserSelectMenuInteraction<'cached'>) => {
			selected.userIds = action.values;
			selected.user = action.users.first() ?? null;

			const _playerRows = playerRows();
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetRoster));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ..._playerRows, buttonRow], content: messageTexts.join('\n') });
		};

		const playerTagsMap: Record<string, string[]> = {};
		const selectPlayers = async (action: StringSelectMenuInteraction<'cached'>) => {
			playerTagsMap[action.customId] = action.values;
			selected.playerTags = Object.values(playerTagsMap).flat();
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetRoster));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const chooseCategory = async (action: ButtonInteraction<'cached'>) => {
			const rosterMenu = new StringSelectMenuBuilder()
				.setMinValues(1)
				.setPlaceholder('Select Group')
				.setCustomId(customIds.categorySelect)
				.setOptions(
					categories.slice(0, 25).map((category) => ({
						label: category.displayName,
						value: category._id.toHexString(),
						default: selected.categoryId === category._id.toHexString()
					}))
				);
			const rosterMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rosterMenu);

			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetRoster));
			return action.update({ components: [rosterMenuRow, buttonRow] });
		};

		const chooseRoster = async (action: ButtonInteraction<'cached'>) => {
			const rosterMenu = new StringSelectMenuBuilder()
				.setMinValues(1)
				.setPlaceholder('Select Roster')
				.setCustomId(customIds.rosterSelect)
				.setOptions(
					rosters.slice(0, 25).map((roster) => ({
						label: roster.name,
						description: `${roster.clan.name} (${roster.clan.tag})`,
						value: roster._id.toHexString(),
						default: selected.rosterId === roster._id.toHexString()
					}))
				);
			const rosterMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rosterMenu);

			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetRoster));
			return action.update({ components: [rosterMenuRow, buttonRow] });
		};

		const selectCategory = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.categoryId = action.values.at(0)!;

			const target = await this.client.rosterManager.getCategory(new ObjectId(selected.categoryId));
			if (!target) return action.reply({ content: 'Target group was deleted.', ephemeral: true });

			selected.targetCategory = target;
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetRoster));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const selectRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.rosterId = action.values.at(0)!;
			if (roster._id.toHexString() === selected.rosterId) {
				return action.reply({ content: 'You cannot move a user to the same roster.', ephemeral: true });
			}
			const target = await this.client.rosterManager.get(new ObjectId(selected.rosterId));
			if (!target) return action.reply({ content: 'Target roster was deleted.', ephemeral: true });

			selected.targetRoster = target;
			confirmButton.setDisabled(!(selected.playerTags.length && selected.targetRoster));

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		createInteractionCollector({
			interaction,
			customIds,
			message,
			onClick: (action) => {
				if (action.customId === customIds.deselect) return deselect(action);
				if (action.customId === customIds.confirm) return confirm(action);
				if (action.customId === customIds.roster) return chooseRoster(action);
				if (action.customId === customIds.category) return chooseCategory(action);
			},
			onSelect: (action) => {
				if (action.customId === customIds.categorySelect) return selectCategory(action);
				if (Object.values(playerCustomIds).includes(action.customId)) return selectPlayers(action);
				if (action.customId === customIds.rosterSelect) return selectRoster(action);
			},
			onUserSelect(interaction) {
				if (interaction.customId === customIds.user) return selectUser(interaction);
			}
		});
	}

	private async delUsers(
		interaction: CommandInteraction<'cached'>,
		{
			roster,
			user
		}: {
			roster: WithId<IRoster>;
			user?: User | null;
		}
	) {
		const playerCustomIds: Record<string, string> = {
			0: this.client.uuid(interaction.user.id),
			1: this.client.uuid(interaction.user.id),
			2: this.client.uuid(interaction.user.id)
		};
		const customIds = {
			user: this.client.uuid(interaction.user.id),
			confirm: this.client.uuid(interaction.user.id),
			deselect: this.client.uuid(interaction.user.id),
			...playerCustomIds
		};

		const selected = {
			playerTags: [] as string[],
			userIds: [] as string[],
			user: null as User | null
		};
		if (user) {
			selected.userIds.push(user.id);
			selected.user = user;
		}

		const maxItems = 25;
		const getOptions = () => {
			const filtered = selected.userIds.length
				? roster.members.filter((mem) => mem.userId && selected.userIds.includes(mem.userId))
				: roster.members;

			if (selected.userIds.length) {
				const filteredTags = filtered.map((op) => op.tag);
				selected.playerTags = selected.playerTags.filter((tag) => filteredTags.includes(tag));
			}

			const options = filtered
				.map((member) => ({
					label: `${member.name} (${member.tag})`,
					value: member.tag
				}))
				.map((member) => ({
					...member,
					default: selected.playerTags.includes(member.value)
				}));
			return options.slice(0, 75);
		};

		const playerRows = () => {
			const _playerRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
			const options = getOptions();
			const chunks = Util.chunk(options, maxItems);

			chunks.forEach((chunk, i) => {
				const playerMenu = new StringSelectMenuBuilder()
					.setMinValues(0)
					.setMaxValues(chunk.length)
					.setCustomId(playerCustomIds[i])
					.setOptions(chunk);

				if (options.length > 25) {
					playerMenu.setPlaceholder(`Select Players [${maxItems * i + 1} - ${maxItems * (i + 1)}]`);
				} else {
					playerMenu.setPlaceholder('Select Players');
				}

				const playerRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(playerMenu);
				_playerRows.push(playerRow);
			});
			return _playerRows;
		};

		const userMenu = new UserSelectMenuBuilder().setCustomId(customIds.user).setPlaceholder('Select User').setMinValues(0);
		const userRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userMenu);

		const confirmButton = new ButtonBuilder()
			.setLabel('Confirm')
			.setCustomId(customIds.confirm)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(!selected.playerTags.length);
		const deselectButton = new ButtonBuilder().setLabel('Deselect').setCustomId(customIds.deselect).setStyle(ButtonStyle.Danger);

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, deselectButton);

		const headerTexts = [
			'**Removing Roster Users**',
			'',
			'- Select the **user** or **players** you want to remove from the roster.',
			'- Click the button below to confirm.'
		];

		const getTexts = () => {
			const options = getOptions();
			let messageTexts = [...headerTexts, ''];
			if (selected.user) {
				messageTexts = [
					...messageTexts,
					'- User selected:',
					`  - **\u200e${selected.user.displayName} (${selected.user.id})**`,
					`  - ${options.length} ${Util.plural(options.length, 'player')} for removal.`
				];
			}

			const players = roster.members.filter((member) => selected.playerTags.includes(member.tag));
			if (players.length) {
				messageTexts = [
					...messageTexts,
					`- Players selected: \n${players.map((player) => `  - ${player.name} (${player.tag})`).join('\n')}`
				];
			}

			return messageTexts;
		};

		const messageTexts = getTexts();
		const message = await interaction.editReply({
			components: [userRow, ...playerRows(), buttonRow],
			content: messageTexts.join('\n')
		});

		const playerTagsMap: Record<string, string[]> = {};
		const selectPlayers = async (action: StringSelectMenuInteraction<'cached'>) => {
			playerTagsMap[action.customId] = action.values;
			selected.playerTags = Object.values(playerTagsMap).flat();
			confirmButton.setDisabled(!selected.playerTags.length);

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const selectUsers = async (action: UserSelectMenuInteraction<'cached'>) => {
			selected.userIds = action.values;
			selected.user = action.users.first() ?? null;

			const _playerRows = playerRows();
			confirmButton.setDisabled(!selected.playerTags.length);

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ..._playerRows, buttonRow], content: messageTexts.join('\n') });
		};

		const deselect = async (action: ButtonInteraction<'cached'>) => {
			selected.playerTags = [];
			selected.userIds = [];
			selected.user = null;

			confirmButton.setDisabled(!selected.playerTags.length);

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const confirm = async (action: ButtonInteraction<'cached'>) => {
			await action.deferUpdate();

			const updated = await this.client.rosterManager.optOut(roster, ...selected.playerTags);
			if (!updated) return action.editReply({ content: 'Roster was deleted.', components: [] });

			return action.editReply({ content: 'Players removed successfully.', components: [] });
		};

		createInteractionCollector({
			interaction,
			customIds,
			message,
			onClick: (action) => {
				if (action.customId === customIds.deselect) return deselect(action);
				return confirm(action);
			},
			onSelect: (action) => selectPlayers(action),
			onUserSelect: (action) => selectUsers(action)
		});
	}

	private async addUsers(
		interaction: CommandInteraction<'cached'>,
		{
			roster,
			user,
			clan,
			categoryId
		}: {
			roster: WithId<IRoster>;
			user?: User | null;
			clan?: APIClan;
			categoryId?: string;
		}
	) {
		const playerCustomIds: Record<string, string> = {
			0: this.client.uuid(interaction.user.id),
			1: this.client.uuid(interaction.user.id),
			2: this.client.uuid(interaction.user.id)
		};
		const customIds = {
			user: this.client.uuid(interaction.user.id),
			confirm: this.client.uuid(interaction.user.id),
			category: this.client.uuid(interaction.user.id),
			categorySelect: this.client.uuid(interaction.user.id),
			bulk: this.client.uuid(interaction.user.id),
			deselect: this.client.uuid(interaction.user.id),
			tags: this.client.uuid(interaction.user.id),
			...playerCustomIds
		};

		const selected = {
			playerTags: [] as string[],
			userIds: [] as string[],
			user: null as User | null,
			players: [] as PlayerWithLink[],
			categoryId: null as null | string,
			targetCategory: null as null | WithId<IRosterCategory>
		};

		if (clan) {
			const players = await this.client.rosterManager.getClanMemberLinks(clan.memberList, roster.allowUnlinked);
			selected.players = players;
		}
		if (user) {
			selected.userIds.push(user.id);
			selected.user = user;
			const players = await this.client.resolver.getPlayers(user.id, 75);
			selected.players = players.map((player) => ({
				...player,
				user: {
					id: user.id,
					displayName: user.displayName
				}
			}));
		}
		if (categoryId) {
			selected.categoryId = categoryId;
			selected.targetCategory = await this.client.rosterManager.getCategory(new ObjectId(categoryId));
		}

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

		const maxItems = 25;
		const getOptions = () => {
			const options = selected.players
				.map((player) => ({
					label: `${player.name} (${player.tag})`,
					value: player.tag
				}))
				.map((player) => ({
					...player,
					default: selected.playerTags.includes(player.value)
				}));
			return options.slice(0, 75);
		};

		const playerRows = () => {
			const _playerRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
			const options = getOptions();
			const chunks = Util.chunk(options, maxItems);

			chunks.forEach((chunk, i) => {
				const playerMenu = new StringSelectMenuBuilder()
					.setMinValues(1)
					.setMaxValues(chunk.length)
					.setCustomId(playerCustomIds[i])
					.setOptions(chunk);

				if (options.length > 25) {
					playerMenu.setPlaceholder(`Select Players [${maxItems * i + 1} - ${maxItems * (i + 1)}]`);
				} else {
					playerMenu.setPlaceholder('Select Players');
				}

				const playerRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(playerMenu);
				_playerRows.push(playerRow);
			});
			return _playerRows;
		};

		const userMenu = new UserSelectMenuBuilder().setCustomId(customIds.user).setPlaceholder('Select User').setMinValues(1);
		if (clan && selected.players.length) {
			userMenu.setPlaceholder(`${clan.name} (${clan.tag})`);
			userMenu.setDisabled(true);
		}

		const userRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userMenu);

		const confirmButton = new ButtonBuilder()
			.setLabel('Confirm')
			.setCustomId(customIds.confirm)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(!selected.playerTags.length);

		const bulkAddButton = new ButtonBuilder()
			.setLabel('Bulk Add')
			.setCustomId(customIds.bulk)
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(false);

		const categorySelectButton = new ButtonBuilder()
			.setLabel('Select Group')
			.setCustomId(customIds.category)
			.setStyle(ButtonStyle.Secondary);

		const deselectButton = new ButtonBuilder()
			.setLabel('Deselect')
			.setCustomId(customIds.deselect)
			.setStyle(ButtonStyle.Danger)
			.setDisabled(false);

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, bulkAddButton);
		if (categories.length) buttonRow.addComponents(categorySelectButton);
		buttonRow.addComponents(deselectButton);

		const headerTexts = [
			'**Adding Roster Users**',
			'',
			'- Select the **user** or **players** you want to add to the roster.',
			'- Click the button below to confirm.'
		];

		const getTexts = () => {
			const options = getOptions();
			let messageTexts = [...headerTexts, ''];

			if (selected.targetCategory) {
				messageTexts = [...messageTexts, '- Group selected:', `  - **\u200e${selected.targetCategory.displayName}**`];
			}

			if (selected.user) {
				messageTexts = [
					...messageTexts,
					'- User selected:',
					`  - **\u200e${selected.user.displayName} (${selected.user.id})**`,
					`  - ${options.length} ${Util.plural(options.length, 'player')} for addition.`
				];
			}

			if (clan && selected.players.length) {
				messageTexts = [
					...messageTexts,
					'- User clan:',
					`  - **\u200e${clan.name} (${clan.tag})**`,
					`  - ${options.length} ${Util.plural(options.length, 'player')} for addition.`
				];
			}

			const players = selected.players.filter((member) => selected.playerTags.includes(member.tag));
			if (players.length) {
				messageTexts = [
					...messageTexts,
					`- Players selected: ${selected.playerTags.length}`,
					players.map((player) => `  - ${player.name} (${player.tag})`).join('\n')
				];
			}

			return messageTexts;
		};

		const messageTexts = getTexts();
		const message = await interaction.editReply({
			components: [userRow, ...playerRows(), buttonRow],
			content: messageTexts.join('\n')
		});

		const playerTagsMap: Record<string, string[]> = {};
		const selectPlayers = async (action: StringSelectMenuInteraction<'cached'>) => {
			playerTagsMap[action.customId] = action.values;
			selected.playerTags = Object.values(playerTagsMap).flat();
			confirmButton.setDisabled(!selected.playerTags.length);

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const selectUsers = async (action: UserSelectMenuInteraction<'cached'>) => {
			selected.userIds = action.values;
			selected.user = action.users.first() ?? null;
			selected.playerTags = [];
			confirmButton.setDisabled(!selected.playerTags.length);

			await action.deferUpdate();

			if (selected.user) {
				const user = selected.user;
				const players = await this.client.resolver.getPlayers(user.id, 75);
				selected.players = players.map((player) => ({
					...player,
					user: {
						id: user.id,
						displayName: user.displayName
					}
				}));
			}

			const messageTexts = getTexts();
			return action.editReply({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const bulkAdd = async (action: ButtonInteraction<'cached'>) => {
			const modalCustomId = this.client.uuid(action.user.id);

			const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Bulk Player Add');
			const titleInput = new TextInputBuilder()
				.setCustomId(customIds.tags)
				.setLabel('Player Tags')
				.setPlaceholder('Enter Player Tags')
				.setStyle(TextInputStyle.Paragraph)
				.setMaxLength(2000)
				.setRequired(true);
			modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput));

			await action.showModal(modal);

			try {
				const modalSubmit = await action.awaitModalSubmit({
					time: 10 * 60 * 1000,
					filter: (action) => action.customId === modalCustomId
				});
				const inputValue = modalSubmit.fields.getTextInputValue(customIds.tags);

				const playerTags = inputValue
					.split(/\W+/)
					.filter((tag) => TAG_REGEX.test(tag))
					.map((tag) => this.client.http.fixTag(tag));

				if (!playerTags.length) {
					return await modalSubmit.reply({ content: 'No valid player tags detected.' });
				}

				await modalSubmit.deferUpdate();

				selected.players = await this.client.rosterManager.getClanMemberLinks(
					playerTags.map((tag) => ({ tag })),
					true
				);
				selected.playerTags = selected.players.map((player) => player.tag);
				confirmButton.setDisabled(!selected.playerTags.length);

				const messageTexts = getTexts();
				return await modalSubmit.editReply({ components: [buttonRow], content: messageTexts.join('\n') });
			} catch (e) {
				if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
					throw e;
				}
			}
		};

		const selectCategory = async (action: StringSelectMenuInteraction<'cached'>) => {
			selected.categoryId = action.values.at(0)!;

			const target = await this.client.rosterManager.getCategory(new ObjectId(selected.categoryId));
			if (!target) return action.reply({ content: 'Target group was deleted.', ephemeral: true });

			selected.targetCategory = target;
			confirmButton.setDisabled(!selected.playerTags.length);

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const chooseCategory = async (action: ButtonInteraction<'cached'>) => {
			const rosterMenu = new StringSelectMenuBuilder()
				.setMinValues(1)
				.setPlaceholder('Select Group')
				.setCustomId(customIds.categorySelect)
				.setOptions(
					categories.slice(0, 25).map((category) => ({
						label: category.displayName,
						value: category._id.toHexString(),
						default: selected.categoryId === category._id.toHexString()
					}))
				);
			const rosterMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rosterMenu);

			confirmButton.setDisabled(!selected.playerTags.length);
			return action.update({ components: [rosterMenuRow, buttonRow] });
		};

		const deselect = async (action: ButtonInteraction<'cached'>) => {
			selected.playerTags = [];
			selected.user = null;
			selected.players = [];
			selected.userIds = [];
			confirmButton.setDisabled(!selected.playerTags.length);

			userMenu.setDisabled(false);
			userMenu.setPlaceholder('Select User');

			const messageTexts = getTexts();
			return action.update({ components: [userRow, ...playerRows(), buttonRow], content: messageTexts.join('\n') });
		};

		const confirm = async (action: ButtonInteraction<'cached'>) => {
			await action.deferUpdate();

			const result = [];
			for (const tag of selected.playerTags) {
				const player = selected.players.find((player) => player.tag === tag)!;
				const updated = await this.client.rosterManager.selfSignup({
					player,
					rosterId: roster._id,
					user: player.user,
					isOwner: false,
					categoryId: selected.targetCategory?._id.toHexString() ?? null
				});
				result.push({
					success: updated.success,
					message: `- **\u200e${player.name} (${player.tag})** \n  - ${updated.message}`
				});
			}

			const errored = result.some((res) => !res.success);
			if (errored) {
				const content = [
					'**Failed to add a few players!**',
					...result.filter((res) => !res.success).map((res) => res.message)
				].join('\n');
				return action.editReply({ content: Util.slice(content), embeds: [], components: [] });
			}
			return action.editReply({ content: 'Players added successfully.', components: [] });
		};

		createInteractionCollector({
			interaction,
			customIds,
			message,
			onClick: (action) => {
				if (action.customId === customIds.bulk) return bulkAdd(action);
				if (action.customId === customIds.deselect) return deselect(action);
				if (action.customId === customIds.category) return chooseCategory(action);
				return confirm(action);
			},
			onSelect: (action) => {
				if (action.customId === customIds.categorySelect) return selectCategory(action);
				return selectPlayers(action);
			},
			onUserSelect: (action) => selectUsers(action)
		});
	}
}
