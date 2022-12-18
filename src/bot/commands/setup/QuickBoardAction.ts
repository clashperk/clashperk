import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	ModalBuilder,
	RoleSelectMenuBuilder,
	TextInputStyle
} from 'discord.js';
import { Command } from '../../lib/index.js';
import { UserInfoModel } from '../../types/index.js';
import { Collections, Settings, status } from '../../util/Constants.js';

export default class QuickBoardActionCommand extends Command {
	public constructor() {
		super('sync', {
			category: 'setup',
			channel: 'guild',
			description: {
				content: ['Setup a quick board for your clan.']
			},
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles', 'ManageNicknames'],
			defer: true
			// ephemeral: true
		});
	}

	public permissionOverwrites(interaction: CommandInteraction<'cached'>) {
		const roleId = this.client.settings.get<string>(interaction.guildId, Settings.BOT_ADMIN_ROLE);
		return interaction.member.roles.cache.has(roleId);
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const customIds = {
			nickname: this.client.uuid(),
			role: this.client.uuid(),
			link: this.client.uuid(),
			modal: this.client.uuid(),
			roles: this.client.uuid()
		};

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(new ButtonBuilder().setCustomId(customIds.nickname).setLabel('Claim Nickname').setStyle(ButtonStyle.Primary))
			.addComponents(new ButtonBuilder().setCustomId(customIds.role).setLabel('Claim Role').setStyle(ButtonStyle.Primary))
			.addComponents(new ButtonBuilder().setCustomId(customIds.link).setLabel('Link Account').setStyle(ButtonStyle.Primary));

		const roles = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
			new RoleSelectMenuBuilder().setCustomId(customIds.roles).setPlaceholder('Select a role').setMaxValues(14)
		);

		const msg = await interaction.editReply({ content: 'This command is currently under development.', components: [row, roles] });

		const collector = msg.createMessageComponentCollector<ComponentType.Button>();
		collector.on('collect', async (action) => {
			if (action.customId === customIds.nickname) {
				await action.deferUpdate();
				const link = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: interaction.user.id });
				const player = await this.client.http.player(link?.entries[0]?.tag);
				const member = interaction.member;
				if (!player.ok) {
					await action.followUp({ ephemeral: true, content: `**${status(player.statusCode, interaction.locale)}**` });
					return;
				}
				if (interaction.guild.members.me?.permissions.has('ManageNicknames')) {
					await interaction.followUp({
						content: this.i18n('command.nickname.missing_access_self', {
							lng: interaction.locale
						}),
						ephemeral: true
					});
					return;
				}
				if (
					interaction.guild.members.me!.roles.highest.position <= member.roles.highest.position ||
					member.id === interaction.guild.ownerId
				) {
					const own = member.id === interaction.user.id;
					await interaction.followUp({
						content: this.i18n(own ? 'command.nickname.missing_access_self' : 'command.nickname.missing_access_other', {
							lng: interaction.locale
						}),
						ephemeral: true
					});
					return;
				}
				const nickname = player.name;
				await interaction.member.setNickname(nickname.substring(0, 31), 'nickname claimed by the user');
			}

			if (action.customId === customIds.link) {
				const modal = new ModalBuilder({
					customId: customIds.modal,
					title: 'Link a Player Account',
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.TextInput,
									style: TextInputStyle.Paragraph,
									customId: 'tag',
									required: true,
									label: 'Player Tag',
									placeholder: 'Enter the Player Tag.',
									maxLength: 15
								}
							]
						},
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.TextInput,
									style: TextInputStyle.Paragraph,
									required: false,
									customId: 'token',
									label: 'API Token (Optional)',
									placeholder: 'The API token can be found in the game settings.',
									maxLength: 15
								}
							]
						}
					]
				});
				await action.showModal(modal);
				try {
					await action
						.awaitModalSubmit({
							time: 5 * 60 * 1000,
							filter: (action) => action.customId === customIds.modal
						})
						.then(async (modalSubmit) => {
							const tag = modalSubmit.fields.getTextInputValue('tag');
							const token = modalSubmit.fields.getTextInputValue('token');
							await modalSubmit.deferUpdate();

							if (token) {
								return this.client.commandHandler.exec(action, this.handler.modules.get('verify')!, { tag, token });
							}
							return this.client.commandHandler.exec(action, this.handler.modules.get('link-create')!, {
								tag,
								forcePlayer: true
							});
						});
				} catch (e) {
					console.error(e);
					await action.followUp({ content: 'Timed out', ephemeral: true });
				}
			}

			if (action.customId === customIds.role) {
				await action.deferUpdate();
				const clans = await this.client.db
					.collection<{ tag: string }>(Collections.CLAN_STORES)
					.find({ guild: action.guild.id, active: true, paused: false }, { projection: { tag: 1, _id: 0 } })
					.toArray();
				if (!clans.length) return;

				const data = await this.client.db.collection<UserInfoModel>(Collections.LINKED_PLAYERS).findOne({ user: action.user.id });
				if (!data?.entries.length) return;

				const clanTags = clans.map((clan) => clan.tag);
				const players = (await this.client.http.detailedClanMembers(data.entries))
					.filter((res) => res.ok)
					.filter((en) => en.clan && clanTags.includes(en.clan.tag));

				for (const data of players) await this.client.rpcHandler.roleManager.newLink(data);
				await action.followUp({ content: 'Roles have been updated.', ephemeral: true });
			}
		});
	}
}
