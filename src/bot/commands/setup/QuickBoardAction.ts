import { randomBytes } from 'crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, ModalBuilder, TextInputStyle } from 'discord.js';
import { Command } from '../../lib/index.js';
import { UserInfoModel } from '../../types/index.js';
import { Collections, Settings } from '../../util/Constants.js';

export default class QuickBoardActionCommand extends Command {
	public constructor() {
		super('setup-quick-board-action', {
			category: 'setup',
			channel: 'guild',
			description: {
				content: ['Setup a quick board for your clan.']
			},
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles', 'ManageNicknames'],
			defer: true,
			ephemeral: true
		});
	}

	public permissionOverwrites(interaction: CommandInteraction<'cached'>) {
		const roleId = this.client.settings.get<string>(interaction.guildId, Settings.BOT_ADMIN_ROLE);
		return interaction.member.roles.cache.has(roleId);
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const customIds = {
			nickname: 'NICKNAME',
			role: 'ROLE',
			link: 'LINK',
			modal: randomBytes(2).toString('hex')
		};

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(new ButtonBuilder().setCustomId(customIds.nickname).setLabel('Claim Nickname').setStyle(ButtonStyle.Primary))
			.addComponents(new ButtonBuilder().setCustomId(customIds.role).setLabel('Claim Role').setStyle(ButtonStyle.Primary))
			.addComponents(new ButtonBuilder().setCustomId(customIds.link).setLabel('Link Account').setStyle(ButtonStyle.Primary));

		const msg = await interaction.editReply({ content: 'This command is currently under development.', components: [row] });

		const collector = msg.createMessageComponentCollector<ComponentType.Button>();
		collector.on('collect', async (action) => {
			if (action.customId === customIds.nickname) {
				const link = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: interaction.user.id });
				if (link?.entries?.length) {
					const player = await this.client.http.player(link.entries[0]?.tag);
					if (!player.ok) return;
					const nickname = player.name;
					await interaction.member.setNickname(nickname.substring(0, 31), 'nickname claimed by the user');
				}
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
									label: 'Clan Description',
									placeholder: 'Write anything or `auto` to sync with the clan.',
									maxLength: 300
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
									label: 'Requirements',
									placeholder: 'Write anything or `auto` to sync with the clan.',
									maxLength: 100
								}
							]
						}
					]
				});
				await action.showModal(modal);
				await action
					.awaitModalSubmit({
						time: 5 * 60 * 1000,
						filter: (action) => action.customId === customIds.modal
					})
					.then(async ({ fields, reply }) => {
						const tag = fields.getTextInputValue('tag');
						const token = fields.getTextInputValue('token');
						const link = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ 'entries.tag': tag });
						if (link?.user === action.user.id) return reply('Already linked');
						const member = interaction.member;
						const player = await this.client.http.player(tag);
						if (!player.ok) return reply('Something went wrong!');
						await this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
							{ user: member.id },
							{
								$set: {
									user_tag: member.user.tag,
									user: member.id,
									createdAt: new Date()
								},
								$push: {
									entries: { tag: player.tag, name: player.name, verified: false }
								}
							},
							{ upsert: true }
						);
						if (token) {
							this.client.http.verifyPlayerToken(player.tag, token);
						}
					});
			}

			if (action.customId === customIds.role) {
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
			}
		});
	}
}
