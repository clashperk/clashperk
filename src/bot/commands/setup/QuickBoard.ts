import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class QuickBoardCommand extends Command {
	public constructor() {
		super('setup-quick-board', {
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

	public async exec(interaction: CommandInteraction<'cached'>) {
		const customIds = {
			nickname: 'NICKNAME',
			role: 'ROLE',
			link: 'LINK'
		};

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(new ButtonBuilder().setCustomId(customIds.nickname).setLabel('Claim Nickname').setStyle(ButtonStyle.Primary))
			.addComponents(new ButtonBuilder().setCustomId(customIds.role).setLabel('Claim Role').setStyle(ButtonStyle.Primary))
			.addComponents(new ButtonBuilder().setCustomId(customIds.link).setLabel('Link Account').setStyle(ButtonStyle.Primary));

		return interaction.editReply({ content: 'This command is currently under development.', components: [row] });
	}
}
