import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class LayoutCommand extends Command {
	public constructor() {
		super('layout', {
			category: 'setup',
			channel: 'guild',
			description: {
				content: ['Create, Remove or View clan aliases.']
			},
			defer: true
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { screenshot: string; title: string; link: string }) {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Copy Layout').setURL(args.link)
		);
		return interaction.editReply({ content: args.title, components: [row], files: [new AttachmentBuilder(args.screenshot)] });
	}
}
