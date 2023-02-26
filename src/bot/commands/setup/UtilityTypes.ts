import {
	ActionRowBuilder,
	AnyThreadChannel,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	DiscordjsError,
	DiscordjsErrorCodes,
	EmbedBuilder,
	ModalBuilder,
	StringSelectMenuBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Settings, URL_REGEX } from '../../util/Constants.js';

export default class SetupUtilsCommand extends Command {
	public constructor() {
		super('setup-utils', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks'],
			defer: true,
			ephemeral: true
		});
	}

	public args(interaction: CommandInteraction<'cached'>): Args {
		return {
			channel: {
				match: 'CHANNEL',
				default: interaction.channel!
			},
			color: {
				match: 'COLOR',
				default: this.client.embed(interaction)
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { channel: TextChannel | AnyThreadChannel; color: number }) {
		const customIds = {
			embed: this.client.uuid(),
			link: this.client.uuid(),
			modal: this.client.uuid(),
			roles: this.client.uuid(),
			token: this.client.uuid(),
			title: this.client.uuid(),
			done: this.client.uuid(),
			description: this.client.uuid(),
			image_url: this.client.uuid(),
			thumbnail_url: this.client.uuid()
		};

		const webhook = await this.client.storage.getWebhook(args.channel.isThread() ? args.channel.parent! : args.channel);
		if (!webhook) {
			return interaction.editReply(
				// eslint-disable-next-line
				this.i18n('command.setup.enable.too_many_webhooks', { lng: interaction.locale, channel: args.channel.toString() })
			);
		}

		const state = this.client.settings.get<EmbedState>(interaction.guild, Settings.LINK_EMBEDS, {
			title: `Welcome to the ${interaction.guild.name}`,
			description: 'Click the button below to link your player account.',
			token_field: 'optional'
		});

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(customIds.embed).setLabel('Customize Embed').setEmoji('✍️').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId(customIds.done).setLabel('Finalize').setStyle(ButtonStyle.Success)
		);
		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(customIds.token)
				.setPlaceholder('Token options')
				.setOptions([
					{
						label: 'Token is required',
						value: 'required',
						default: state.token_field === 'required',
						description: 'The user must provide a token to link their account.'
					},
					{
						label: 'Token is optional',
						value: 'optional',
						default: state.token_field === 'optional',
						description: 'The user can optionally provide a token to link their account.'
					},
					{
						label: 'Token field is hidden',
						value: 'hidden',
						default: state.token_field === 'hidden',
						description: "The token field won't be shown to the user."
					}
				])
				.setMaxValues(1)
				.setMinValues(1)
		);

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));
		embed.setTitle(state.title);
		embed.setDescription(state.description);
		embed.setImage(state.image_url || null);
		embed.setThumbnail(state.thumbnail_url || null);

		const linkButton = new ButtonBuilder()
			.setCustomId(JSON.stringify({ cmd: 'link-add', token_field: state.token_field }))
			.setLabel('Link account')
			.setEmoji('🔗')
			.setStyle(ButtonStyle.Primary);
		const helpButton = new ButtonBuilder()
			.setDisabled(true)
			.setLabel('How to link?')
			.setStyle(ButtonStyle.Link)
			.setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton, helpButton);

		await interaction.editReply({ embeds: [embed], components: [linkButtonRow] });
		await interaction.followUp({
			ephemeral: true,
			content: [
				'**Customization**',
				'',
				'- You can customize the embed by clicking the button below.',
				'- Optionally, you can personalize the webhook name and avatar in the channel settings.',
				'- Once you are done, click the `Finalize` button to send the link button to the channel.'
			].join('\n'),
			components: [menuRow, row]
		});

		const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 10 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.done) {
				await action.update({ components: [] });
				collector.stop();
				await webhook.send(
					args.channel.isThread()
						? { embeds: [embed], components: [linkButtonRow], threadId: args.channel.id }
						: { embeds: [embed], components: [linkButtonRow] }
				);
			}

			if (action.customId === customIds.token && action.isStringSelectMenu()) {
				await action.deferUpdate();
				state.token_field = action.values.at(0) as 'required' | 'optional' | 'hidden';

				linkButton.setCustomId(JSON.stringify({ cmd: 'link-add', token_field: state.token_field }));
				const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton, helpButton);

				await this.client.settings.set(interaction.guild.id, Settings.LINK_EMBEDS, state);
				await interaction.editReply({ embeds: [embed], components: [linkButtonRow], message: '@original' });
			}

			if (action.customId === customIds.embed) {
				const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Link a Player Account');
				const titleInput = new TextInputBuilder()
					.setCustomId(customIds.title)
					.setLabel('Title')
					.setPlaceholder('Enter a title')
					.setStyle(TextInputStyle.Short)
					.setMaxLength(256)
					.setRequired(true);
				if (state.title) titleInput.setValue(state.title);

				const descriptionInput = new TextInputBuilder()
					.setCustomId(customIds.description)
					.setLabel('Description')
					.setPlaceholder('Write anything you want (markdown, hyperlink and custom emojis are supported)')
					.setStyle(TextInputStyle.Paragraph)
					.setMaxLength(2000)
					.setRequired(true);
				if (state.description) descriptionInput.setValue(state.description);

				const imageInput = new TextInputBuilder()

					.setCustomId(customIds.image_url)
					.setLabel('Image URL')
					.setPlaceholder('Enter an image URL')
					.setStyle(TextInputStyle.Short)
					.setMaxLength(256)
					.setRequired(false);
				if (state.image_url) imageInput.setValue(state.image_url);

				const thumbnailInput = new TextInputBuilder()
					.setCustomId(customIds.thumbnail_url)
					.setLabel('Thumbnail URL')
					.setPlaceholder('Enter a thumbnail URL')
					.setStyle(TextInputStyle.Short)
					.setMaxLength(256)
					.setRequired(false);
				if (state.thumbnail_url) thumbnailInput.setValue(state.thumbnail_url);

				modal.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
					new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
					new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput),
					new ActionRowBuilder<TextInputBuilder>().addComponents(thumbnailInput)
				);

				await action.showModal(modal);

				try {
					await action
						.awaitModalSubmit({
							dispose: true,
							time: 10 * 60 * 1000,
							filter: (action) => action.customId === customIds.modal
						})
						.then(async (modalSubmit) => {
							const title = modalSubmit.fields.getTextInputValue(customIds.title);
							const description = modalSubmit.fields.getTextInputValue(customIds.description);
							const imageUrl = modalSubmit.fields.getTextInputValue(customIds.image_url);
							const thumbnailUrl = modalSubmit.fields.getTextInputValue(customIds.thumbnail_url);

							state.title = title;
							state.description = description;
							state.image_url = URL_REGEX.test(imageUrl) ? imageUrl : '';
							state.thumbnail_url = URL_REGEX.test(thumbnailUrl) ? thumbnailUrl : '';

							await modalSubmit.deferUpdate();

							embed.setTitle(state.title);
							embed.setDescription(state.description);
							embed.setImage(state.image_url || null);
							embed.setThumbnail(state.thumbnail_url || null);

							linkButton.setCustomId(JSON.stringify({ cmd: 'link-add', token_field: state.token_field }));
							const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton, helpButton);

							await this.client.settings.set(interaction.guild.id, Settings.LINK_EMBEDS, state);
							await interaction.editReply({ embeds: [embed], components: [linkButtonRow], message: '@original' });
						});
				} catch (e) {
					if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
						throw e;
					}
				}
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(customIds).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}
}

interface EmbedState {
	title: string;
	description: string;
	image_url: string;
	thumbnail_url: string;
	token_field: string;
}
