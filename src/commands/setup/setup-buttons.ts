import { DiscordErrorCodes, Settings, URL_REGEX } from '@app/constants';
import { LinkButtonConfig } from '@app/entities';
import {
  ActionRowBuilder,
  AnyThreadChannel,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  DiscordjsError,
  DiscordjsErrorCodes,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';

export default class SetupButtonsCommand extends Command {
  public constructor() {
    super('setup-buttons', {
      category: 'setup',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: [
        'EmbedLinks',
        'UseExternalEmojis',
        'ManageWebhooks',
        'SendMessagesInThreads',
        'SendMessages',
        'ReadMessageHistory',
        'ViewChannel'
      ],
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
      embed_color: {
        match: 'COLOR'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      button_type: string;
      embed_color: number;
      channel: TextChannel | AnyThreadChannel;
      disable?: boolean;
    }
  ) {
    if (args.button_type === 'role-refresh-button') {
      return this.selfRefreshButton(interaction, args);
    }
    if (args.button_type === 'link-button') {
      return this.linkButton(interaction, args);
    }
    if (args.button_type === 'my-rosters-button') {
      return this.myRostersButton(interaction, args);
    }

    return this.customButton(interaction, args);
  }

  private async linkButton(
    interaction: CommandInteraction<'cached'>,
    args: { channel: TextChannel | AnyThreadChannel; disable?: boolean; embed_color: number }
  ) {
    const customIds = {
      embed: this.client.uuid(),
      link: this.client.uuid(),
      roles: this.client.uuid(),
      token: this.client.uuid(),
      buttonStyle: this.client.uuid(),
      title: this.client.uuid(),
      done: this.client.uuid(),
      description: this.client.uuid(),
      imageUrl: this.client.uuid(),
      thumbnailUrl: this.client.uuid()
    };

    const state = this.client.settings.get<LinkButtonConfig>(interaction.guild, Settings.LINK_EMBEDS, {
      title: `Welcome to ${interaction.guild.name}`,
      description: 'Click the button below to link your account.',
      token_field: 'optional',
      thumbnail_url: interaction.guild.iconURL({ forceStatic: false })
    });
    if (!state.button_style) state.button_style = ButtonStyle.Primary;
    if (args.embed_color) state.embed_color = args.embed_color ?? this.client.embed(interaction);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.embed).setLabel('Customize Embed').setEmoji('✍️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(customIds.done).setLabel('Post Embed').setStyle(ButtonStyle.Success)
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
    const buttonColorMenu = this.buttonStyleMenu(customIds.buttonStyle, state.button_style);

    const embed = new EmbedBuilder();
    if (state.embed_color) embed.setColor(state.embed_color);
    embed.setTitle(state.title);
    embed.setDescription(state.description);
    embed.setImage(state.image_url || null);
    embed.setThumbnail(state.thumbnail_url || null);

    const linkButton = new ButtonBuilder()
      .setCustomId(JSON.stringify({ cmd: 'link-add', token_field: state.token_field }))
      .setLabel('Link account')
      .setEmoji('🔗')
      .setStyle(state.button_style);
    const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

    const resetImages = async () => {
      state.image_url = '';
      state.thumbnail_url = '';
      embed.setImage(null);
      embed.setThumbnail(null);
      await this.client.settings.set(interaction.guild.id, Settings.LINK_EMBEDS, state);
      await interaction.editReply({ embeds: [embed], components: [linkButtonRow], message: '@original' });
    };

    try {
      await interaction.editReply({ embeds: [embed], components: [linkButtonRow] });
    } catch (e) {
      if (e.code === DiscordErrorCodes.INVALID_FORM_BODY) {
        await resetImages();
      } else {
        throw e;
      }
    }

    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: [
        '### Customization Guide',
        '- You can customize the embed by clicking the button below.',
        '- Once you are done, click the `Post Embed` button to send the Link button to the channel.'
      ].join('\n'),
      components: [menuRow, buttonColorMenu, row]
    });

    const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.done) {
        await action.update({ components: [] });
        collector.stop();
        await interaction.channel?.send({ embeds: [embed], components: [linkButtonRow] });
        return;
      }

      if ([customIds.buttonStyle, customIds.token].includes(action.customId) && action.isStringSelectMenu()) {
        await action.deferUpdate();
        if (action.customId === customIds.buttonStyle) {
          state.button_style = Number(action.values.at(0) ?? ButtonStyle.Primary);
        } else {
          state.token_field = action.values.at(0) as 'required' | 'optional' | 'hidden';
        }

        linkButton.setCustomId(JSON.stringify({ cmd: 'link-add', token_field: state.token_field }));
        linkButton.setStyle(state.button_style);
        const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

        await this.client.settings.set(interaction.guild.id, Settings.LINK_EMBEDS, state);
        await interaction.editReply({ embeds: [embed], components: [linkButtonRow], message: '@original' });
      }

      if (action.customId === customIds.embed) {
        try {
          const { title, description, imageUrl, thumbnailUrl, modalSubmitInteraction } = await this.handleCustomEmbed(action, customIds, {
            ...state,
            imageUrl: state.image_url,
            thumbnailUrl: state.thumbnail_url
          });

          state.title = title;
          state.description = description;
          state.image_url = URL_REGEX.test(imageUrl) ? imageUrl : '';
          state.thumbnail_url = URL_REGEX.test(thumbnailUrl) ? thumbnailUrl : '';

          await modalSubmitInteraction.deferUpdate();

          embed.setTitle(state.title);
          embed.setDescription(state.description);
          embed.setImage(state.image_url || null);
          embed.setThumbnail(state.thumbnail_url || null);

          linkButton.setCustomId(JSON.stringify({ cmd: 'link-add', token_field: state.token_field }));
          const linkButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

          await this.client.settings.set(interaction.guild.id, Settings.LINK_EMBEDS, state);
          await interaction.editReply({ embeds: [embed], components: [linkButtonRow], message: '@original' });
        } catch (e) {
          if (e.code === DiscordErrorCodes.INVALID_FORM_BODY) {
            await resetImages();
          } else if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
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

  private async selfRefreshButton(
    interaction: CommandInteraction<'cached'>,
    args: { channel: TextChannel | AnyThreadChannel; disable?: boolean; embed_color: number }
  ) {
    const customIds = {
      embed: this.client.uuid(),
      done: this.client.uuid(),
      title: this.client.uuid(),
      description: this.client.uuid(),
      imageUrl: this.client.uuid(),
      buttonStyle: this.client.uuid(),
      thumbnailUrl: this.client.uuid()
    };

    const state = this.client.settings.get<LinkButtonConfig>(interaction.guild, Settings.REFRESH_EMBEDS, {
      title: `Welcome to ${interaction.guild.name}`,
      description: 'Click the button below to refresh your roles and nickname.',
      thumbnailUrl: interaction.guild.iconURL({ forceStatic: false })
    });
    if (!state.button_style) state.button_style = ButtonStyle.Primary;
    if (args.embed_color) state.embed_color = args.embed_color ?? this.client.embed(interaction);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.embed).setLabel('Customize Embed').setEmoji('✍️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(customIds.done).setLabel('Post Embed').setStyle(ButtonStyle.Success)
    );

    const buttonColorMenu = this.buttonStyleMenu(customIds.buttonStyle, state.button_style);

    const embed = new EmbedBuilder();
    if (state.embed_color) embed.setColor(state.embed_color);
    embed.setTitle(state.title);
    embed.setDescription(state.description);
    embed.setThumbnail(state.thumbnail_url || null);
    embed.setImage(state.image_url || null);

    const customId = this.createId({ cmd: 'autorole-refresh', ephemeral: true });
    const linkButton = new ButtonBuilder()
      .setLabel('Refresh Roles')
      .setEmoji(EMOJIS.REFRESH)
      .setCustomId(customId)
      .setStyle(state.button_style);
    const refreshButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

    const resetImages = async () => {
      state.image_url = '';
      state.thumbnail_url = '';
      embed.setImage(null);
      embed.setThumbnail(null);
      await this.client.settings.set(interaction.guild.id, Settings.REFRESH_EMBEDS, state);
      await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
    };

    try {
      await interaction.editReply({ embeds: [embed], components: [refreshButtonRow] });
    } catch (e) {
      if (e.code === DiscordErrorCodes.INVALID_FORM_BODY) {
        await resetImages();
      } else {
        throw e;
      }
    }

    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: [
        '### Customization Guide',
        '- You can customize the embed by clicking the button below.',
        '- Once you are done, click the `Post Embed` button to send the Link button to the channel.'
      ].join('\n'),
      components: [buttonColorMenu, row]
    });

    const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.done) {
        await action.update({ components: [] });
        collector.stop();
        await interaction.channel?.send({ embeds: [embed], components: [refreshButtonRow] });
        return;
      }

      if (action.customId === customIds.buttonStyle && action.isStringSelectMenu()) {
        await action.deferUpdate();
        state.button_style = Number(action.values.at(0) ?? ButtonStyle.Primary);

        linkButton.setCustomId(customId);
        linkButton.setStyle(state.button_style);

        await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
      }

      if (action.customId === customIds.embed) {
        try {
          const { title, description, imageUrl, thumbnailUrl, modalSubmitInteraction } = await this.handleCustomEmbed(action, customIds, {
            ...state,
            imageUrl: state.image_url,
            thumbnailUrl: state.thumbnail_url
          });

          state.title = title;
          state.description = description;
          state.image_url = URL_REGEX.test(imageUrl) ? imageUrl : '';
          state.thumbnail_url = URL_REGEX.test(thumbnailUrl) ? thumbnailUrl : '';

          await modalSubmitInteraction.deferUpdate();

          embed.setTitle(state.title);
          embed.setDescription(state.description);
          embed.setImage(state.image_url || null);
          embed.setThumbnail(state.thumbnail_url || null);

          await this.client.settings.set(interaction.guild.id, Settings.REFRESH_EMBEDS, state);
          await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
        } catch (e) {
          if (e.code === DiscordErrorCodes.INVALID_FORM_BODY) {
            await resetImages();
          } else if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
            throw e;
          }
        }
      }
    });
  }

  private async customButton(
    interaction: CommandInteraction<'cached'>,
    args: { channel: TextChannel | AnyThreadChannel; disable?: boolean; embed_color: number }
  ) {
    const customIds = {
      embed: this.client.uuid(),
      done: this.client.uuid(),
      title: this.client.uuid(),
      description: this.client.uuid(),
      imageUrl: this.client.uuid(),
      buttonStyle: this.client.uuid(),
      thumbnailUrl: this.client.uuid()
    };

    const state = this.client.settings.get<LinkButtonConfig>(interaction.guild, Settings.REFRESH_EMBEDS, {
      title: `Welcome to ${interaction.guild.name}`,
      description: 'Click the button below to refresh your roles and nickname.',
      thumbnailUrl: interaction.guild.iconURL({ forceStatic: false })
    });
    if (!state.button_style) state.button_style = ButtonStyle.Primary;
    if (args.embed_color) state.embed_color = args.embed_color ?? this.client.embed(interaction);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.embed).setLabel('Customize Embed').setEmoji('✍️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(customIds.done).setLabel('Post Embed').setStyle(ButtonStyle.Success)
    );

    const buttonColorMenu = this.buttonStyleMenu(customIds.buttonStyle, state.button_style);

    const embed = new EmbedBuilder();
    if (state.embed_color) embed.setColor(state.embed_color);
    embed.setTitle(state.title);
    embed.setDescription(state.description);
    embed.setThumbnail(state.thumbnail_url || null);
    embed.setImage(state.image_url || null);

    const customId = this.createId({ cmd: 'autorole-refresh', ephemeral: true });
    const linkButton = new ButtonBuilder()
      .setLabel('Refresh Roles')
      .setEmoji(EMOJIS.REFRESH)
      .setCustomId(customId)
      .setStyle(state.button_style);
    const refreshButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

    const resetImages = async () => {
      state.image_url = '';
      state.thumbnail_url = '';
      embed.setImage(null);
      embed.setThumbnail(null);
      await this.client.settings.set(interaction.guild.id, Settings.REFRESH_EMBEDS, state);
      await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
    };

    try {
      await interaction.editReply({ embeds: [embed], components: [refreshButtonRow] });
    } catch (e) {
      if (e.code === DiscordErrorCodes.INVALID_FORM_BODY) {
        await resetImages();
      } else {
        throw e;
      }
    }

    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: [
        '### Customization Guide',
        '- You can customize the embed by clicking the button below.',
        '- Once you are done, click the `Post Embed` button to send the Link button to the channel.'
      ].join('\n'),
      components: [buttonColorMenu, row]
    });

    const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.done) {
        await action.update({ components: [] });
        collector.stop();
        await interaction.channel?.send({ embeds: [embed], components: [refreshButtonRow] });
        return;
      }

      if (action.customId === customIds.buttonStyle && action.isStringSelectMenu()) {
        await action.deferUpdate();
        state.button_style = Number(action.values.at(0) ?? ButtonStyle.Primary);

        linkButton.setCustomId(customId);
        linkButton.setStyle(state.button_style);

        await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
      }

      if (action.customId === customIds.embed) {
        try {
          const { title, description, imageUrl, thumbnailUrl, modalSubmitInteraction } = await this.handleCustomEmbed(action, customIds, {
            ...state,
            imageUrl: state.image_url,
            thumbnailUrl: state.thumbnail_url
          });

          state.title = title;
          state.description = description;
          state.image_url = URL_REGEX.test(imageUrl) ? imageUrl : '';
          state.thumbnail_url = URL_REGEX.test(thumbnailUrl) ? thumbnailUrl : '';

          await modalSubmitInteraction.deferUpdate();

          embed.setTitle(state.title);
          embed.setDescription(state.description);
          embed.setImage(state.image_url || null);
          embed.setThumbnail(state.thumbnail_url || null);

          await this.client.settings.set(interaction.guild.id, Settings.REFRESH_EMBEDS, state);
          await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
        } catch (e) {
          if (e.code === DiscordErrorCodes.INVALID_FORM_BODY) {
            await resetImages();
          } else if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
            throw e;
          }
        }
      }
    });
  }

  private async myRostersButton(
    interaction: CommandInteraction<'cached'>,
    args: { channel: TextChannel | AnyThreadChannel; disable?: boolean; embed_color: number }
  ) {
    const customIds = {
      embed: this.client.uuid(),
      done: this.client.uuid(),
      title: this.client.uuid(),
      description: this.client.uuid(),
      imageUrl: this.client.uuid(),
      buttonStyle: this.client.uuid(),
      thumbnailUrl: this.client.uuid()
    };

    const state = this.client.settings.get<LinkButtonConfig>(interaction.guild, Settings.MY_ROSTERS_EMBEDS, {
      title: `Welcome to ${interaction.guild.name}`,
      description: "Click the button below to find the rosters you're in.",
      thumbnailUrl: interaction.guild.iconURL({ forceStatic: false })
    });
    if (!state.button_style) state.button_style = ButtonStyle.Primary;
    if (args.embed_color) state.embed_color = args.embed_color ?? this.client.embed(interaction);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.embed).setLabel('Customize Embed').setEmoji('✍️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(customIds.done).setLabel('Post Embed').setStyle(ButtonStyle.Success)
    );

    const buttonColorMenu = this.buttonStyleMenu(customIds.buttonStyle, state.button_style);

    const embed = new EmbedBuilder();
    if (state.embed_color) embed.setColor(state.embed_color);
    embed.setTitle(state.title);
    embed.setDescription(state.description);
    embed.setThumbnail(state.thumbnail_url || null);
    embed.setImage(state.image_url || null);

    const customId = this.createId({ cmd: 'roster-list', ephemeral: true });
    const linkButton = new ButtonBuilder()
      .setLabel('My Rosters')
      .setEmoji(EMOJIS.REFRESH)
      .setCustomId(customId)
      .setStyle(state.button_style);
    const refreshButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

    const resetImages = async () => {
      state.image_url = '';
      state.thumbnail_url = '';
      embed.setImage(null);
      embed.setThumbnail(null);
      await this.client.settings.set(interaction.guild.id, Settings.MY_ROSTERS_EMBEDS, state);
      await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
    };

    try {
      await interaction.editReply({ embeds: [embed], components: [refreshButtonRow] });
    } catch (e) {
      if (e.code === DiscordErrorCodes.INVALID_FORM_BODY) {
        await resetImages();
      } else {
        throw e;
      }
    }

    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: [
        '### Customization Guide',
        '- You can customize the embed by clicking the button below.',
        '- Once you are done, click the `Post Embed` button to send the Link button to the channel.'
      ].join('\n'),
      components: [buttonColorMenu, row]
    });

    const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.done) {
        await action.update({ components: [] });
        collector.stop();
        await interaction.channel?.send({ embeds: [embed], components: [refreshButtonRow] });
        return;
      }

      if (action.customId === customIds.buttonStyle && action.isStringSelectMenu()) {
        await action.deferUpdate();
        state.button_style = Number(action.values.at(0) ?? ButtonStyle.Primary);

        linkButton.setCustomId(customId);
        linkButton.setStyle(state.button_style);

        await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
      }

      if (action.customId === customIds.embed) {
        try {
          const { title, description, imageUrl, thumbnailUrl, modalSubmitInteraction } = await this.handleCustomEmbed(action, customIds, {
            ...state,
            imageUrl: state.image_url,
            thumbnailUrl: state.thumbnail_url
          });

          state.title = title;
          state.description = description;
          state.image_url = URL_REGEX.test(imageUrl) ? imageUrl : '';
          state.thumbnail_url = URL_REGEX.test(thumbnailUrl) ? thumbnailUrl : '';

          await modalSubmitInteraction.deferUpdate();

          embed.setTitle(state.title);
          embed.setDescription(state.description);
          embed.setImage(state.image_url || null);
          embed.setThumbnail(state.thumbnail_url || null);

          await this.client.settings.set(interaction.guild.id, Settings.MY_ROSTERS_EMBEDS, state);
          await interaction.editReply({ embeds: [embed], components: [refreshButtonRow], message: '@original' });
        } catch (e) {
          if (e.code === DiscordErrorCodes.INVALID_FORM_BODY) {
            await resetImages();
          } else if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
            throw e;
          }
        }
      }
    });
  }

  private async handleCustomEmbed(
    action: ButtonInteraction | StringSelectMenuInteraction,
    customIds: { title: string; description: string; imageUrl: string; thumbnailUrl: string },
    state: CustomEmbed
  ) {
    const modalCustomId = this.client.uuid(action.user.id);
    const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Link a Player Account');
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
      .setCustomId(customIds.imageUrl)
      .setLabel('Image URL')
      .setPlaceholder('Enter an image URL')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setRequired(false);
    if (state.imageUrl) imageInput.setValue(state.imageUrl);

    const thumbnailInput = new TextInputBuilder()
      .setCustomId(customIds.thumbnailUrl)
      .setLabel('Thumbnail URL')
      .setPlaceholder('Enter a thumbnail URL')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setRequired(false);
    if (state.thumbnailUrl) thumbnailInput.setValue(state.thumbnailUrl);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(thumbnailInput)
    );

    await action.showModal(modal);

    const modalSubmitInteraction = await action.awaitModalSubmit({
      time: 10 * 60 * 1000,
      filter: (action) => action.customId === modalCustomId
    });

    const title = modalSubmitInteraction.fields.getTextInputValue(customIds.title);
    const description = modalSubmitInteraction.fields.getTextInputValue(customIds.description);
    const imageUrl = modalSubmitInteraction.fields.getTextInputValue(customIds.imageUrl);
    const thumbnailUrl = modalSubmitInteraction.fields.getTextInputValue(customIds.thumbnailUrl);

    return { title, description, imageUrl, thumbnailUrl, modalSubmitInteraction };
  }

  private buttonStyleMenu(customId: string, currentStyle: ButtonStyle) {
    const buttonColorMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('Button Style')
        .setOptions([
          {
            label: `${ButtonStyle[ButtonStyle.Danger]} (Red)`,
            value: ButtonStyle.Danger.toString(),
            default: currentStyle === ButtonStyle.Danger
          },
          {
            label: `${ButtonStyle[ButtonStyle.Primary]} (Blurple)`,
            value: ButtonStyle.Primary.toString(),
            default: currentStyle === ButtonStyle.Primary
          },
          {
            label: `${ButtonStyle[ButtonStyle.Secondary]} (Grey)`,
            value: ButtonStyle.Secondary.toString(),
            default: currentStyle === ButtonStyle.Secondary
          },
          {
            label: `${ButtonStyle[ButtonStyle.Success]} (Green)`,
            value: ButtonStyle.Success.toString(),
            default: currentStyle === ButtonStyle.Success
          }
        ])
        .setMaxValues(1)
        .setMinValues(1)
    );

    return buttonColorMenu;
  }
}

interface CustomEmbed {
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
}
