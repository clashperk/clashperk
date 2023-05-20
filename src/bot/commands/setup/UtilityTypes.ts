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
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Collections, Settings, URL_REGEX } from '../../util/Constants.js';
import { GuildEventData, eventsMap, imageMaps } from '../../struct/GuildEventsHandler.js';

export default class SetupUtilsCommand extends Command {
	public constructor() {
		super('setup-utils', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageWebhooks'],
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

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { channel: TextChannel | AnyThreadChannel; color: number; option: string; disable?: boolean; max_duration?: number }
	) {
		if (args.option === 'events-schedular') return this.handleEvents(interaction, args);

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
			title: `Welcome to ${interaction.guild.name}`,
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
		const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

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
				const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

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
							const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

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

	public async handleEvents(
		interaction: CommandInteraction<'cached'>,
		{ disable, max_duration }: { disable?: boolean; max_duration?: number }
	) {
		if (disable) {
			await this.client.db.collection(Collections.GUILD_EVENTS).deleteOne({ guildId: interaction.guild.id });
			return interaction.editReply({ content: 'Successfully disabled automatic events schedular.' });
		}

		if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageEvents)) {
			return interaction.editReply({ content: "I'm missing **Manage Events** permission to execute this command." });
		}

		const customIds = {
			select: this.client.uuid(interaction.user.id),
			images: this.client.uuid(interaction.user.id),
			duration: this.client.uuid(interaction.user.id),
			confirm: this.client.uuid(interaction.user.id),
			modal: this.client.uuid(interaction.user.id),
			clan_games: this.client.uuid(interaction.user.id),
			capital_raids: this.client.uuid(interaction.user.id),
			cwl: this.client.uuid(interaction.user.id),
			season_reset: this.client.uuid(interaction.user.id)
		};

		const { value } = await this.client.db.collection<GuildEventData>(Collections.GUILD_EVENTS).findOneAndUpdate(
			{ guildId: interaction.guild.id },
			{
				$setOnInsert: {
					enabled: false,
					events: {},
					images: {},
					allowedEvents: [...this.client.guildEvents.eventTypes],
					createdAt: new Date()
				},
				$set: {
					maxDuration: max_duration ?? 60
				}
			},
			{ upsert: true, returnDocument: 'after' }
		);

		const state = {
			allowedEvents: value?.allowedEvents ?? [],
			durationOverrides: value?.durationOverrides ?? [],
			clan_games_image_url: value?.images?.clan_games_image_url ?? '',
			raid_week_image_url: value?.images?.raid_week_image_url ?? '',
			cwl_image_url: value?.images?.cwl_image_url ?? '',
			season_reset_image_url: value?.images?.season_reset_image_url ?? ''
		};

		const menu = new StringSelectMenuBuilder()
			.setCustomId(customIds.select)
			.setPlaceholder('Select allowed events...')
			.setOptions(
				this.client.guildEvents.eventTypes.map((id) => ({
					label: eventsMap[id],
					value: id,
					default: state.allowedEvents.includes(id)
				}))
			)
			.setMinValues(1)
			.setMaxValues(this.client.guildEvents.eventTypes.length);

		const durationEvents = this.client.guildEvents.eventTypes.filter((name) => name.endsWith('_start'));
		const durationMenu = new StringSelectMenuBuilder()
			.setCustomId(customIds.duration)
			.setPlaceholder('Max duration overrides...')
			.setOptions(
				durationEvents.map((id) => ({
					label: eventsMap[id],
					value: id,
					description: `The event stays until the end of the ${eventsMap[id]}`,
					default: state.durationOverrides.includes(id)
				}))
			)
			.setMinValues(0)
			.setMaxValues(durationEvents.length);

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(menu);
		const durationRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(durationMenu);
		const buttonRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setCustomId(customIds.confirm).setLabel('Confirm').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId(customIds.images).setLabel('Set Images').setStyle(ButtonStyle.Secondary)
		);

		const getContent = () => {
			return [
				'**Creating automatic events schedular...**',
				'',
				'**Enabled Events**',
				this.client.guildEvents.eventTypes
					.filter((event) => state.allowedEvents.includes(event))
					.map((event) =>
						state[imageMaps[event] as unknown as keyof typeof state]
							? `• [${eventsMap[event]}](<${state[imageMaps[event] as keyof typeof state] as string}>)`
							: `• ${eventsMap[event]}`
					)
					.join('\n'),

				'',
				'*Note: Click the Confirm button to save the events.*'
			].join('\n');
		};

		const msg = await interaction.editReply({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 10 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.confirm) {
				await action.deferUpdate();
				const { allowedEvents, durationOverrides, ...images } = state;

				const { value } = await this.client.db.collection<GuildEventData>(Collections.GUILD_EVENTS).findOneAndUpdate(
					{ guildId: interaction.guild.id },
					{
						$set: {
							images,
							enabled: true,
							allowedEvents: [...allowedEvents],
							durationOverrides: [...durationOverrides]
						}
					},
					{ returnDocument: 'after', upsert: true }
				);

				if (!value) {
					await action.editReply({
						content: 'Event schedular was deleted while you were configuring it.',
						components: []
					});
					return;
				}

				await this.client.guildEvents.create(interaction.guild, value);

				const content = getContent().split('\n');
				await action.editReply({
					content: ['**Successfully created automatic events schedular...**', ...content.slice(1, content.length - 1)].join('\n'),
					components: []
				});
			}

			if (action.customId === customIds.select && action.isStringSelectMenu()) {
				state.allowedEvents = [...action.values];
				menu.setOptions(
					this.client.guildEvents.eventTypes.map((id) => ({
						label: eventsMap[id],
						value: id,
						description: `The event stays until the end of the ${eventsMap[id]}`,
						default: state.allowedEvents.includes(id)
					}))
				);
				await action.update({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
			}

			if (action.customId === customIds.duration && action.isStringSelectMenu()) {
				state.durationOverrides = [...action.values];
				durationMenu.setOptions(
					durationEvents.map((id) => ({
						label: eventsMap[id],
						value: id,
						default: state.durationOverrides.includes(id)
					}))
				);
				await action.update({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
			}

			if (action.customId === customIds.images) {
				const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Custom Images');
				const seasonResetInput = new TextInputBuilder()
					.setCustomId(customIds.season_reset)
					.setLabel('Season Reset Image URL')
					.setPlaceholder('Enter Season Reset image URL')
					.setStyle(TextInputStyle.Short)
					.setMaxLength(256)
					.setRequired(false);
				if (state.season_reset_image_url) seasonResetInput.setValue(state.season_reset_image_url);

				const clanGamesImageInput = new TextInputBuilder()
					.setCustomId(customIds.clan_games)
					.setLabel('Clan Games Image URL')
					.setPlaceholder('Enter Clan Games image URL')
					.setStyle(TextInputStyle.Short)
					.setMaxLength(256)
					.setRequired(false);
				if (state.clan_games_image_url) clanGamesImageInput.setValue(state.clan_games_image_url);

				const cwlImageInput = new TextInputBuilder()
					.setCustomId(customIds.cwl)
					.setLabel('CWL Image URL')
					.setPlaceholder('Enter CWL image URL')
					.setStyle(TextInputStyle.Short)
					.setMaxLength(256)
					.setRequired(false);
				if (state.cwl_image_url) cwlImageInput.setValue(state.cwl_image_url);

				const capitalRaidInput = new TextInputBuilder()
					.setCustomId(customIds.capital_raids)
					.setLabel('Capital Raid Image URL')
					.setPlaceholder('Enter Capital Raid image URL')
					.setStyle(TextInputStyle.Short)
					.setMaxLength(256)
					.setRequired(false);
				if (state.raid_week_image_url) capitalRaidInput.setValue(state.raid_week_image_url);

				modal.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(seasonResetInput),
					new ActionRowBuilder<TextInputBuilder>().addComponents(cwlImageInput),
					new ActionRowBuilder<TextInputBuilder>().addComponents(capitalRaidInput),
					new ActionRowBuilder<TextInputBuilder>().addComponents(clanGamesImageInput)
				);

				await action.showModal(modal);

				try {
					await action
						.awaitModalSubmit({
							time: 10 * 60 * 1000,
							filter: (action) => action.customId === customIds.modal
						})
						.then(async (modalSubmit) => {
							const season_reset_image_url = modalSubmit.fields.getTextInputValue(customIds.season_reset);
							const cwl_image_url = modalSubmit.fields.getTextInputValue(customIds.cwl);
							const raid_week_image_url = modalSubmit.fields.getTextInputValue(customIds.capital_raids);
							const clan_games_image_url = modalSubmit.fields.getTextInputValue(customIds.clan_games);

							state.season_reset_image_url = URL_REGEX.test(season_reset_image_url) ? season_reset_image_url : '';
							state.cwl_image_url = URL_REGEX.test(cwl_image_url) ? cwl_image_url : '';
							state.raid_week_image_url = URL_REGEX.test(raid_week_image_url) ? raid_week_image_url : '';
							state.clan_games_image_url = URL_REGEX.test(clan_games_image_url) ? clan_games_image_url : '';

							await modalSubmit.deferUpdate();
							await modalSubmit.editReply({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
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
