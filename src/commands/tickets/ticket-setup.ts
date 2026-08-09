import { Collections, PLAYER_LEAGUE_MAP } from '@app/constants';
import {
  SAVED_REPLY_VARIABLES,
  TicketGuildSettingsEntity,
  TicketPanelEntity,
  TicketTypeConfig
} from '@app/entities';
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  CommandInteraction,
  ComponentType,
  ContainerBuilder,
  DiscordjsError,
  DiscordjsErrorCodes,
  LabelBuilder,
  MessageComponentInteraction,
  MessageFlags,
  ModalBuilder,
  RoleSelectMenuBuilder,
  SectionBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { ObjectId, WithId } from 'mongodb';
import { nanoid } from 'nanoid';
import { Command } from '../../lib/handlers.js';

const CUSTOM_EMOJI_RE = /^<a?:[\w]{2,32}:\d{17,19}>$/;
const isValidEmoji = (input: string) => {
  const trimmed = input.trim();
  if (CUSTOM_EMOJI_RE.test(trimmed)) return true;
  // Unicode emoji: must contain at least one pictographic/emoji character and no ':'
  return !trimmed.includes(':') && /\p{Extended_Pictographic}/u.test(trimmed);
};

const DEFAULT_EMBED = {
  title: 'Open a Ticket',
  description: 'Click a button below to open a support ticket.',
  color: 0x5865f2
};

const DEFAULT_NAMING = 'ticket-{count}';

export default class TicketSetupCommand extends Command {
  public constructor() {
    super('ticket-setup', {
      category: 'tickets',
      channel: 'guild',
      clientPermissions: [
        'ManageChannels',
        'ManageRoles',
        'EmbedLinks',
        'UseExternalEmojis',
        'SendMessages',
        'ReadMessageHistory',
        'ViewChannel',
        'CreatePrivateThreads',
        'SendMessagesInThreads'
      ],
      defer: true,
      ephemeral: true
    });
  }

  private get ticketPanels() {
    return this.client.db.collection<TicketPanelEntity>(Collections.TICKET_PANELS);
  }

  private get ticketGuildSettings() {
    return this.client.db.collection<TicketGuildSettingsEntity>(Collections.TICKET_SETTINGS);
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    return this.setupDashboard(interaction as CommandInteraction<'cached'>, args);
  }

  // =================== SETUP DASHBOARD ===================

  private async setupDashboard(
    interaction: CommandInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const panelName = args.panel_name as string | undefined;
    if (!panelName) {
      return interaction.editReply({ content: 'Please provide a panel name.' });
    }

    let panel = await this.getPanel(interaction.guildId, panelName);

    if (!panel) {
      const insertResult = await this.ticketPanels.insertOne({
        _id: new ObjectId(),
        guildId: interaction.guildId,
        name: panelName,
        embed: { ...DEFAULT_EMBED },
        displayMode: 'menu',
        button: { label: 'Create Ticket', emoji: '📩', style: ButtonStyle.Primary },
        ticketTypes: [
          {
            id: nanoid(8),
            label: 'General',
            requireLinkedAccount: false,
            pingRoleIds: [],
            viewOnlyRoleIds: [],
            addRoleIds: [],
            removeRoleIds: [],
            namingConvention: 'ticket-{count}',
            createStaffThread: false
          }
        ],
        logChannels: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      panel = await this.ticketPanels.findOne({ _id: insertResult.insertedId });
    }

    if (!panel) return interaction.editReply({ content: 'Failed to load panel.' });

    const ids = this.makeDashboardIds(interaction.user.id);

    const getReplyCount = async () => {
      const ticketGuildSettings = await this.ticketGuildSettings.findOne(
        { guildId: interaction.guildId },
        { projection: { savedReplies: 1 } }
      );
      return ticketGuildSettings?.savedReplies?.length ?? 0;
    };
    let replyCount = await getReplyCount();

    await interaction.editReply({
      components: [this.buildDashboard(panel, ids, replyCount)],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button>({
      filter: (a) => Object.values(ids).includes(a.customId) && a.user.id === interaction.user.id,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === ids.done) {
        collector.stop('done');
        await action.update({
          components: [
            new ContainerBuilder().addTextDisplayComponents((t) =>
              t.setContent('Panel saved successfully.')
            )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return;
      }

      const btn = action as unknown as ButtonInteraction<'cached'>;
      try {
        if (action.customId === ids.editEmbed) {
          await this.editEmbedModal(btn, panel!);
          panel = (await this.getPanel(panel!.guildId, panel!.name)) ?? panel;
        } else if (action.customId === ids.editPanelButton) {
          panel = await this.editPanelButtonModal(btn, panel!);
        } else if (action.customId === ids.editTicketTypes) {
          await action.deferUpdate();
          panel = await this.editTicketTypesFlow(interaction, btn, panel!);
        } else if (action.customId === ids.editMessages) {
          await action.deferUpdate();
          await this.editSavedRepliesFlow(interaction, panel!.guildId);
          replyCount = await getReplyCount();
        } else if (action.customId === ids.editLogging) {
          panel = await this.editLoggingModal(btn, panel!);
        } else if (action.customId === ids.editExtraButtons) {
          await action.deferUpdate();
          panel = await this.editExtraButtonsFlow(interaction, panel!);
        }
      } catch (error) {
        if (
          error instanceof DiscordjsError &&
          error.code === DiscordjsErrorCodes.InteractionCollectorError
        ) {
          // Timed out — ignore
        } else {
          throw error;
        }
      }

      if (panel) {
        await interaction
          .editReply({
            components: [this.buildDashboard(panel, ids, replyCount)],
            flags: MessageFlags.IsComponentsV2
          })
          .catch(() => null);
      }
    });

    collector.on('end', (_, reason) => {
      Object.values(ids).forEach((id) => this.client.components.delete(id));
      if (reason !== 'done' && reason !== 'time') {
        return interaction.editReply({ components: [] }).catch(() => null);
      }
    });
  }

  private makeDashboardIds(userId: string) {
    return {
      editEmbed: this.client.uuid(userId),
      editPanelButton: this.client.uuid(userId),
      editTicketTypes: this.client.uuid(userId),
      editMessages: this.client.uuid(userId),
      editLogging: this.client.uuid(userId),
      editExtraButtons: this.client.uuid(userId),
      done: this.client.uuid(userId)
    };
  }

  private buildDashboard(
    panel: WithId<TicketPanelEntity>,
    ids: ReturnType<typeof this.makeDashboardIds>,
    savedReplyCount = 0
  ) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Panel: ${panel.name}\nConfigure your ticket panel below. Click **Edit** on any section to change it.`
      )
    );
    container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));

    // Embed section
    const embedText = [
      `**Title:** ${panel.embed.title ?? '*(not set)*'}`,
      `**Description:** ${(panel.embed.description ?? '*(not set)*').slice(0, 60)}${(panel.embed.description?.length ?? 0) > 60 ? '…' : ''}`,
      `**Color:** ${panel.embed.color ? `#${panel.embed.color.toString(16).padStart(6, '0')}` : '*(default)*'}`
    ].join('\n');
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Step 1: Embed\n${embedText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editEmbed)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));

    // Create Ticket button section
    const displayMode = panel.displayMode ?? 'menu';
    const panelButtonLines: string[] = [];
    if (displayMode === 'buttons') {
      panelButtonLines.push(
        `**Mode:** Buttons`,
        `-# Each application type gets its own button. Best when you have 2-5 application types.`
      );
      if (panel.ticketTypes.length > 5) {
        panelButtonLines.push(
          `-# ⚠️ You have more than 5 types — falling back to select menu until you reduce them.`
        );
      } else if (panel.ticketTypes.length > 0) {
        panelButtonLines.push(
          `-# Button label, emoji, and style are configured per type under **Application Types**.`
        );
      }
    } else {
      panelButtonLines.push(
        `**Mode:** Select Menu`,
        `-# A single button opens a dropdown when you have multiple application types.`,
        `**Label:** ${panel.button.label} | **Emoji:** ${panel.button?.emoji ?? '*(none)*'} | **Style:** ${panel.button?.style != null ? (ButtonStyle[panel.button.style] ?? panel.button.style) : 'Primary'}`
      );
    }
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Step 2: Panel Button\n${panelButtonLines.join('\n')}`
          )
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editPanelButton)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large));

    // Application Types section
    const appTypesText =
      panel.ticketTypes.length === 0
        ? '*(no application types)*'
        : panel.ticketTypes
            .map((type, i) => {
              const details: string[] = [];
              if (type.pingRoleIds.length)
                details.push(`Ping: ${type.pingRoleIds.map((id) => `<@&${id}>`).join(', ')}`);
              else details.push('No staff roles');
              if (type.questions?.length) details.push(`${type.questions.length} question(s)`);
              if (type.requireLinkedAccount) {
                details.push('Linked account required');
                if (type.thMin) details.push(`TH${type.thMin}+`);
                if (type.minTrophies) details.push(`${type.minTrophies}+ trophies`);
                if (type.minLeagueTier)
                  details.push(PLAYER_LEAGUE_MAP[type.minLeagueTier] ?? type.minLeagueTier);
              }
              return `${i + 1}. ${type.emoji ? `${type.emoji} ` : ''}**${type.label}**\n  - ${details.join(' · ')}`;
            })
            .join('\n');
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Step 3: Application Types\n${appTypesText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editTicketTypes)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large));

    // Saved Replies
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Step 4: Saved Replies\nPre-written messages shared across all application types in this server. (${savedReplyCount}/25 configured)`
          )
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editMessages)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));

    // Logging
    const logText = [
      `**Button click:** ${panel.logChannels.buttonClick ? `<#${panel.logChannels.buttonClick}>` : '*(not set)*'}`,
      `**Status change:** ${panel.logChannels.statusChange ? `<#${panel.logChannels.statusChange}>` : '*(not set)*'}`,
      `**Ticket close:** ${panel.logChannels.ticketClose ? `<#${panel.logChannels.ticketClose}>` : '*(not set)*'}`
    ].join('\n');
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Step 5: Logging\n${logText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editLogging)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));

    // Extra Buttons
    const extraButtonsText = panel.extraButtons?.length
      ? panel.extraButtons
          .map(
            (eb, i) =>
              `${i + 1}. ${eb.emoji ? `${eb.emoji} ` : ''}**${eb.label}** (${eb.url ? 'link' : eb.cmd})`
          )
          .join('\n')
      : '*(none)*';
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Step 6: Extra Buttons\n${extraButtonsText}\n-# Placement: ${(panel.extraButtonsPlacement ?? 'row') === 'row' ? 'Same row as Create Ticket' : 'New row below Create Ticket'}`
          )
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editExtraButtons)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Warnings
    const warnings: string[] = [];
    if (panel.ticketTypes.length === 0) {
      warnings.push(
        '⚠️ No application types configured — add at least one so users can open tickets.'
      );
    } else if (panel.ticketTypes.every((b) => b.pingRoleIds.length === 0)) {
      warnings.push("⚠️ No staff roles set — tickets won't ping anyone.");
    }
    if (warnings.length > 0) {
      container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(warnings.join('\n')));
    }

    container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder().setCustomId(ids.done).setLabel('Done').setStyle(ButtonStyle.Success)
      )
    );

    return container;
  }

  // ========= SECTION EDIT FLOWS =========

  private async editEmbedModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ) {
    const customIds = {
      modal: this.client.uuid(action.user.id),
      title: nanoid(8),
      desc: nanoid(8),
      color: nanoid(8)
    };

    const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Edit Panel Embed');

    const titleInput = new TextInputBuilder()
      .setCustomId(customIds.title)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setRequired(false)
      .setPlaceholder('Enter embed title');
    if (panel.embed.title) titleInput.setValue(panel.embed.title);

    const descInput = new TextInputBuilder()
      .setCustomId(customIds.desc)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(2000)
      .setRequired(false)
      .setPlaceholder('Enter embed description (markdown supported)');
    if (panel.embed.description) descInput.setValue(panel.embed.description);

    const colorInput = new TextInputBuilder()
      .setCustomId(customIds.color)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(7)
      .setRequired(false)
      .setPlaceholder('#5865F2');
    if (panel.embed.color)
      colorInput.setValue(`#${panel.embed.color.toString(16).padStart(6, '0')}`);

    modal.addLabelComponents(
      new LabelBuilder().setLabel('Title').setTextInputComponent(titleInput),
      new LabelBuilder().setLabel('Description').setTextInputComponent(descInput),
      new LabelBuilder().setLabel('Color (hex, e.g. #5865F2)').setTextInputComponent(colorInput)
    );

    await action.showModal(modal);

    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === customIds.modal
    });

    const title = submit.fields.getTextInputValue(customIds.title) || undefined;
    const description = submit.fields.getTextInputValue(customIds.desc) || undefined;
    const colorRaw = submit.fields.getTextInputValue(customIds.color);
    const color = colorRaw ? parseInt(colorRaw.replace('#', ''), 16) || undefined : undefined;

    await this.ticketPanels.updateOne(
      { _id: panel._id },
      {
        $set: {
          'embed.title': title,
          'embed.description': description,
          'embed.color': color,
          'updatedAt': new Date()
        }
      }
    );

    await submit.deferUpdate();
    this.client.components.delete(customIds.modal);
  }

  private async editPanelButtonModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ): Promise<WithId<TicketPanelEntity>> {
    const customIds = {
      modal: this.client.uuid(action.user.id),
      mode: nanoid(8),
      label: nanoid(8),
      emoji: nanoid(8),
      style: nanoid(8)
    };

    const current = panel.button ?? {
      label: 'Create Ticket',
      emoji: '📩',
      style: ButtonStyle.Primary
    };
    const currentMode = panel.displayMode ?? 'menu';

    const labelInput = new TextInputBuilder()
      .setCustomId(customIds.label)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(80)
      .setRequired(true)
      .setValue(current.label);
    const emojiInput = new TextInputBuilder()
      .setCustomId(customIds.emoji)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(56)
      .setRequired(false);
    if (current.emoji) emojiInput.setValue(current.emoji);

    const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Edit Panel Button');
    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel('Display Mode')
        .setDescription('How application types are presented to the Panel.')
        .setStringSelectMenuComponent(
          new StringSelectMenuBuilder().setCustomId(customIds.mode).setOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('Select Menu')
              .setValue('menu')
              .setDescription('One button opens a dropdown for members to choose a type')
              .setDefault(currentMode === 'menu'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Buttons')
              .setValue('buttons')
              .setDescription('One button per application type (max 5; falls back to menu if more)')
              .setDefault(currentMode === 'buttons')
          )
        ),
      new LabelBuilder()
        .setLabel('Button Label (select menu mode only)')
        .setTextInputComponent(labelInput),
      new LabelBuilder()
        .setLabel('Emoji (select menu mode only)')
        .setTextInputComponent(emojiInput),
      new LabelBuilder().setLabel('Style (select menu mode only)').setStringSelectMenuComponent(
        new StringSelectMenuBuilder().setCustomId(customIds.style).setOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Primary')
            .setValue('1')
            .setDefault(current.style === ButtonStyle.Primary),
          new StringSelectMenuOptionBuilder()
            .setLabel('Secondary')
            .setValue('2')
            .setDefault(current.style === ButtonStyle.Secondary),
          new StringSelectMenuOptionBuilder()
            .setLabel('Success')
            .setValue('3')
            .setDefault(current.style === ButtonStyle.Success),
          new StringSelectMenuOptionBuilder()
            .setLabel('Danger')
            .setValue('4')
            .setDefault(current.style === ButtonStyle.Danger)
        )
      )
    );

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === customIds.modal
    });

    const displayMode = (submit.fields.getStringSelectValues(customIds.mode)?.[0] ?? 'menu') as
      | 'menu'
      | 'buttons';
    const label = submit.fields.getTextInputValue(customIds.label) || current.label;
    const emojiRaw = submit.fields.getTextInputValue(customIds.emoji);
    const emoji = emojiRaw && isValidEmoji(emojiRaw) ? emojiRaw : undefined;
    const styleVal = parseInt(submit.fields.getStringSelectValues(customIds.style)?.[0] ?? '1');
    const style = [
      ButtonStyle.Primary,
      ButtonStyle.Secondary,
      ButtonStyle.Success,
      ButtonStyle.Danger
    ].includes(styleVal)
      ? styleVal
      : ButtonStyle.Primary;

    await this.ticketPanels.updateOne(
      { _id: panel._id },
      { $set: { displayMode, button: { label, emoji, style }, updatedAt: new Date() } }
    );

    await submit.deferUpdate();
    this.client.components.delete(customIds.modal);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editTicketTypesFlow(
    interaction: CommandInteraction<'cached'>,
    triggerAction: MessageComponentInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ): Promise<WithId<TicketPanelEntity>> {
    const staticIds = {
      addButton: this.client.uuid(interaction.user.id),
      toggleMode: this.client.uuid(interaction.user.id),
      reorder: this.client.uuid(interaction.user.id),
      back: this.client.uuid(interaction.user.id)
    };

    const perButtonIds = new Map<string, { edit: string }>();

    const getOrCreateButtonIds = (btnId: string) => {
      if (!perButtonIds.has(btnId)) {
        perButtonIds.set(btnId, { edit: this.client.uuid(interaction.user.id) });
      }
      return perButtonIds.get(btnId)!;
    };

    for (const b of panel.ticketTypes) getOrCreateButtonIds(b.id);

    const renderButtonsMenu = (currentPanel: WithId<TicketPanelEntity>) => {
      const mode = currentPanel.displayMode ?? 'menu';
      const modeLabel = mode === 'buttons' ? 'Buttons' : 'Select Menu';
      const modeDescription =
        mode === 'buttons'
          ? 'Each type gets its own button on the panel (max 5).'
          : 'Types appear in a dropdown when members click the panel button.';

      const container = new ContainerBuilder();
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                '## Application Types',
                `**Display Mode: ${modeLabel}** — ${modeDescription}`,
                currentPanel.ticketTypes.length === 0
                  ? '-# No types yet — click **Add Type** to create your first one.'
                  : mode === 'buttons'
                    ? `-# Up to **5 types** in Buttons mode (${currentPanel.ticketTypes.length}/5 used). Click **Edit / Delete** to edit or remove a type.`
                    : `-# Up to **25 types** in Select Menu mode (${currentPanel.ticketTypes.length}/25 used). Click **Edit / Delete** to edit or remove a type.`
              ].join('\n')
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(staticIds.toggleMode)
              .setLabel(mode === 'buttons' ? 'Switch to Menu' : 'Switch to Buttons')
              .setStyle(ButtonStyle.Secondary)
          )
      );
      for (const b of currentPanel.ticketTypes) {
        const bIds = getOrCreateButtonIds(b.id);
        container.addSeparatorComponents((sep) => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  `${b.emoji ? `${b.emoji} ` : ''}**${b.label}**`,
                  `Ping: ${b.pingRoleIds.length ? b.pingRoleIds.map((r) => `<@&${r}>`).join(', ') : '*None*'} | Questions: ${b.questions?.length ?? 0}`,
                  b.requireLinkedAccount
                    ? `Linked account required | TH min: ${b.thMin ?? 'Any'} | Trophies: ${b.minTrophies ?? 'Any'} | League: ${b.minLeagueTier ? (PLAYER_LEAGUE_MAP[b.minLeagueTier] ?? b.minLeagueTier) : 'Any'}`
                    : 'No linked account required'
                ].join('\n')
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(bIds.edit)
                .setLabel('Edit / Delete')
                .setStyle(ButtonStyle.Secondary)
            )
        );
      }

      container.addSeparatorComponents((sep) => sep.setSpacing(SeparatorSpacingSize.Small));

      const actionRow = [
        new ButtonBuilder()
          .setCustomId(staticIds.addButton)
          .setLabel('Add Type')
          .setEmoji('➕')
          .setStyle(ButtonStyle.Success)
          .setDisabled(currentPanel.ticketTypes.length >= 25)
      ];
      if (currentPanel.ticketTypes.length > 1) {
        actionRow.push(
          new ButtonBuilder()
            .setCustomId(staticIds.reorder)
            .setLabel('Reorder')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      actionRow.push(
        new ButtonBuilder()
          .setCustomId(staticIds.back)
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary)
      );
      container.addActionRowComponents((row) => row.addComponents(...actionRow));
      return container;
    };

    let currentPanel = panel;
    await interaction.editReply({
      components: [renderButtonsMenu(currentPanel)],
      flags: MessageFlags.IsComponentsV2
    });

    return new Promise<WithId<TicketPanelEntity>>((resolve) => {
      const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button>({
        filter: (a) => {
          const allIds = [
            ...Object.values(staticIds),
            ...[...perButtonIds.values()].map(({ edit }) => edit)
          ];
          return allIds.includes(a.customId) && a.user.id === interaction.user.id;
        },
        time: 5 * 60 * 1000
      });

      collector.on('collect', async (action) => {
        if (action.customId === staticIds.back) {
          await action.deferUpdate();
          collector.stop('back');
          return;
        }

        if (action.customId === staticIds.toggleMode) {
          await action.deferUpdate();
          const newMode = (currentPanel.displayMode ?? 'menu') === 'buttons' ? 'menu' : 'buttons';
          await this.ticketPanels.updateOne(
            { _id: currentPanel._id },
            { $set: { displayMode: newMode, updatedAt: new Date() } }
          );
          currentPanel =
            (await this.getPanel(currentPanel.guildId, currentPanel.name)) ?? currentPanel;
        } else if (action.customId === staticIds.reorder) {
          const customIds = { modal: this.client.uuid(action.user.id), select: nanoid(8) };
          const n = currentPanel.ticketTypes.length;
          const modal = new ModalBuilder()
            .setCustomId(customIds.modal)
            .setTitle('Reorder Application Types');
          modal.addLabelComponents(
            new LabelBuilder()
              .setLabel('Select all types in your desired order:')
              .setDescription('')
              .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                  .setCustomId(customIds.select)
                  .setMinValues(n)
                  .setMaxValues(n)
                  .setOptions(
                    ...currentPanel.ticketTypes.map((t) => {
                      const opt = new StringSelectMenuOptionBuilder()
                        .setLabel(t.label)
                        .setValue(t.id);
                      if (t.emoji) opt.setEmoji(t.emoji);
                      return opt;
                    })
                  )
              )
          );
          await action.showModal(modal);
          const submit = await action
            .awaitModalSubmit({
              filter: (s) => s.customId === customIds.modal,
              time: 5 * 60 * 1000
            })
            .catch(() => null);
          if (submit) {
            const selected = submit.fields.getStringSelectValues(customIds.select) ?? [];
            if (selected.length === n) {
              const reordered = selected.map(
                (id) => currentPanel.ticketTypes.find((t) => t.id === id)!
              );
              await this.ticketPanels.updateOne(
                { _id: currentPanel._id },
                { $set: { ticketTypes: reordered, updatedAt: new Date() } }
              );
              currentPanel =
                (await this.getPanel(currentPanel.guildId, currentPanel.name)) ?? currentPanel;
            }
            await submit.deferUpdate();
          }
        } else if (action.customId === staticIds.addButton) {
          try {
            currentPanel = await this.addTicketTypeModal(
              action as ButtonInteraction<'cached'>,
              currentPanel
            );
            for (const b of currentPanel.ticketTypes) getOrCreateButtonIds(b.id);
          } catch (e) {
            if (
              !(
                e instanceof DiscordjsError &&
                e.code === DiscordjsErrorCodes.InteractionCollectorError
              )
            )
              throw e;
          }
        } else {
          for (const [btnId, bIds] of perButtonIds) {
            if (action.customId === bIds.edit) {
              await action.deferUpdate();
              currentPanel = await this.editSingleTicketTypeFlow(interaction, currentPanel, btnId);
              for (const b of currentPanel.ticketTypes) getOrCreateButtonIds(b.id);
              break;
            }
          }
        }

        await interaction
          .editReply({
            components: [renderButtonsMenu(currentPanel)],
            flags: MessageFlags.IsComponentsV2
          })
          .catch(() => null);
      });

      collector.on('end', (_unused_args) => {
        [
          ...Object.values(staticIds),
          ...[...perButtonIds.values()].map(({ edit }) => edit)
        ].forEach((id) => this.client.components.delete(id));
        resolve(currentPanel);
      });
    });
  }

  private async addTicketTypeModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ): Promise<WithId<TicketPanelEntity>> {
    const customIds = {
      modal: this.client.uuid(action.user.id),
      label: nanoid(8),
      emoji: nanoid(8)
    };

    const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Add Application Type');
    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel('Label')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(customIds.label)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(80)
            .setRequired(true)
            .setPlaceholder('e.g. Clan Application, Support Ticket')
        ),
      new LabelBuilder()
        .setLabel('Emoji (optional, e.g. 🎫 or :emoji_name:)')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(customIds.emoji)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(56)
            .setRequired(false)
            .setPlaceholder('📩')
        )
    );

    await action.showModal(modal);

    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === customIds.modal
    });

    const label = submit.fields.getTextInputValue(customIds.label);
    const emojiRaw = submit.fields.getTextInputValue(customIds.emoji);
    const emoji = emojiRaw && isValidEmoji(emojiRaw) ? emojiRaw : undefined;

    const newButton: TicketTypeConfig = {
      id: nanoid(8),
      label,
      emoji,
      requireLinkedAccount: false,
      pingRoleIds: [],
      viewOnlyRoleIds: [],
      addRoleIds: [],
      removeRoleIds: [],
      namingConvention: DEFAULT_NAMING,
      createStaffThread: false
    };

    await this.ticketPanels.updateOne(
      { _id: panel._id },
      { $push: { ticketTypes: newButton }, $set: { updatedAt: new Date() } }
    );

    await submit.deferUpdate();
    this.client.components.delete(customIds.modal);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editSingleTicketTypeFlow(
    interaction: CommandInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>,
    buttonId: string
  ): Promise<WithId<TicketPanelEntity>> {
    let currentPanel = panel;
    let btn = currentPanel.ticketTypes.find((b) => b.id === buttonId)!;
    if (!btn) return currentPanel;

    const ids = {
      editLabel: this.client.uuid(interaction.user.id),
      editStyle: this.client.uuid(interaction.user.id),
      editRoles: this.client.uuid(interaction.user.id),
      editRules: this.client.uuid(interaction.user.id),
      editQuestions: this.client.uuid(interaction.user.id),
      editCategories: this.client.uuid(interaction.user.id),
      editNaming: this.client.uuid(interaction.user.id),
      back: this.client.uuid(interaction.user.id),
      delete: this.client.uuid(interaction.user.id)
    };

    const renderBtn = (b: TicketTypeConfig) => {
      const container = new ContainerBuilder();
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                `## Edit Application Type: ${b.label}`,
                `**Label:** ${b.label} | **Emoji:** ${b.emoji ?? '*(none)*'}`,
                `**Button Style:** ${b.buttonStyle != null ? (ButtonStyle[b.buttonStyle] ?? b.buttonStyle) : 'Primary'}`
              ].join('\n')
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(ids.editLabel)
              .setLabel('Edit Label/Emoji')
              .setStyle(ButtonStyle.Secondary)
          )
      );
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                '**Staff Roles**',
                `Ping: ${b.pingRoleIds.length ? b.pingRoleIds.map((r) => `<@&${r}>`).join(', ') : '*(none)*'}`,
                `Viewer: ${b.viewOnlyRoleIds.length ? b.viewOnlyRoleIds.map((r) => `<@&${r}>`).join(', ') : '*(none)*'}`,
                `Add roles: ${b.addRoleIds.length ? b.addRoleIds.map((r) => `<@&${r}>`).join(', ') : '*(none)*'}`,
                `Remove roles: ${b.removeRoleIds.length ? b.removeRoleIds.map((r) => `<@&${r}>`).join(', ') : '*(none)*'}`
              ].join('\n')
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(ids.editRoles)
              .setLabel('Edit')
              .setStyle(ButtonStyle.Secondary)
          )
      );
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                '**Rules**',
                b.requireLinkedAccount
                  ? `Linked account required | TH min: ${b.thMin ?? 'Any'} | Trophies: ${b.minTrophies ?? 'Any'} | League: ${b.minLeagueTier ? (PLAYER_LEAGUE_MAP[b.minLeagueTier] ?? b.minLeagueTier) : 'Any'}`
                  : 'No linked account required',
                [
                  `Staff thread: ${b.createStaffThread ? 'Yes' : 'No'}`,
                  `Auto-sleep: ${b.autoSleepHours ? `${b.autoSleepHours}h` : 'Off'}`,
                  `Claiming: ${b.allowClaim ? 'Enabled' : 'Disabled'}`
                ].join(' | ')
              ].join('\n')
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(ids.editRules)
              .setLabel('Edit')
              .setStyle(ButtonStyle.Secondary)
          )
      );
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Questions**\n${b.questions?.length ? b.questions.map((q, i) => `${i + 1}. ${q.label}`).join('\n') : '*(none)*'}`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(ids.editQuestions)
              .setLabel('Edit')
              .setStyle(ButtonStyle.Secondary)
          )
      );
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Categories**\nOpen: ${b.openCategoryId ? `<#${b.openCategoryId}>` : '*(none)*'} | Sleep: ${b.sleepCategoryId ? `<#${b.sleepCategoryId}>` : '*(none)*'} | Closed: ${b.closedCategoryId ? `<#${b.closedCategoryId}>` : '*(none)*'}`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(ids.editCategories)
              .setLabel('Edit')
              .setStyle(ButtonStyle.Secondary)
          )
      );
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Naming:** \`${b.namingConvention}\``)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(ids.editNaming)
              .setLabel('Edit')
              .setStyle(ButtonStyle.Secondary)
          )
      );
      container.addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder().setCustomId(ids.back).setLabel('Back').setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(ids.delete)
            .setLabel('Delete Type')
            .setStyle(ButtonStyle.Danger)
        )
      );
      return container;
    };

    await interaction.editReply({
      components: [renderBtn(btn)],
      flags: MessageFlags.IsComponentsV2
    });

    return new Promise<WithId<TicketPanelEntity>>((resolve) => {
      const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button>({
        filter: (a) => Object.values(ids).includes(a.customId) && a.user.id === interaction.user.id,
        time: 5 * 60 * 1000
      });

      const updateTicketType = async (update: Partial<TicketTypeConfig>) => {
        await this.ticketPanels.updateOne(
          { '_id': currentPanel._id, 'ticketTypes.id': buttonId },
          {
            $set: {
              ...Object.fromEntries(
                Object.entries(update).map(([k, v]) => [`ticketTypes.$.${k}`, v])
              ),
              updatedAt: new Date()
            }
          }
        );
        currentPanel =
          (await this.getPanel(currentPanel.guildId, currentPanel.name)) ?? currentPanel;
        btn = currentPanel.ticketTypes.find((b) => b.id === buttonId)!;
      };

      collector.on('collect', async (action) => {
        if (action.customId === ids.back) {
          await action.deferUpdate();
          collector.stop('back');
          return;
        }

        if (action.customId === ids.delete) {
          await action.deferUpdate();
          await this.ticketPanels.updateOne(
            { _id: currentPanel._id },
            { $pull: { ticketTypes: { id: buttonId } } }
          );
          currentPanel =
            (await this.getPanel(currentPanel.guildId, currentPanel.name)) ?? currentPanel;
          collector.stop('deleted');
          return;
        }

        try {
          if (action.customId === ids.editLabel) {
            const customIds = {
              modal: this.client.uuid(action.user.id),
              label: nanoid(8),
              emoji: nanoid(8),
              btnStyle: nanoid(8)
            };
            const modal = new ModalBuilder()
              .setCustomId(customIds.modal)
              .setTitle('Edit Application Type');
            const labelInput = new TextInputBuilder()
              .setCustomId(customIds.label)
              .setStyle(TextInputStyle.Short)
              .setMaxLength(80)
              .setRequired(true);
            if (btn.label) labelInput.setValue(btn.label);
            const emojiInput = new TextInputBuilder()
              .setCustomId(customIds.emoji)
              .setStyle(TextInputStyle.Short)
              .setMaxLength(56)
              .setRequired(false);
            if (btn.emoji) emojiInput.setValue(btn.emoji);
            const currentBtnStyle = btn.buttonStyle ?? ButtonStyle.Primary;
            modal.addLabelComponents(
              new LabelBuilder().setLabel('Label').setTextInputComponent(labelInput),
              new LabelBuilder().setLabel('Emoji (optional)').setTextInputComponent(emojiInput),
              new LabelBuilder()
                .setLabel('Button Style (Buttons display mode only)')
                .setStringSelectMenuComponent(
                  new StringSelectMenuBuilder().setCustomId(customIds.btnStyle).setOptions(
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Primary')
                      .setValue('1')
                      .setDefault(currentBtnStyle === ButtonStyle.Primary),
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Secondary')
                      .setValue('2')
                      .setDefault(currentBtnStyle === ButtonStyle.Secondary),
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Success')
                      .setValue('3')
                      .setDefault(currentBtnStyle === ButtonStyle.Success),
                    new StringSelectMenuOptionBuilder()
                      .setLabel('Danger')
                      .setValue('4')
                      .setDefault(currentBtnStyle === ButtonStyle.Danger)
                  )
                )
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === customIds.modal
            });
            const btnStyleVal = parseInt(
              submit.fields.getStringSelectValues(customIds.btnStyle)?.[0] ?? '1'
            );
            const buttonStyle = [
              ButtonStyle.Primary,
              ButtonStyle.Secondary,
              ButtonStyle.Success,
              ButtonStyle.Danger
            ].includes(btnStyleVal)
              ? btnStyleVal
              : ButtonStyle.Primary;
            await updateTicketType({
              label: submit.fields.getTextInputValue(customIds.label),
              emoji: (() => {
                const raw = submit.fields.getTextInputValue(customIds.emoji);
                return raw && isValidEmoji(raw) ? raw : undefined;
              })(),
              buttonStyle
            });
            await submit.deferUpdate();
            this.client.components.delete(customIds.modal);
          } else if (action.customId === ids.editRoles) {
            currentPanel = await this.editTicketTypeRolesModal(
              action as unknown as ButtonInteraction<'cached'>,
              currentPanel,
              buttonId,
              btn
            );
            btn = currentPanel.ticketTypes.find((b) => b.id === buttonId)!;
          } else if (action.customId === ids.editRules) {
            const customIds = {
              modal: this.client.uuid(action.user.id),
              th: nanoid(8),
              trophies: nanoid(8),
              league: nanoid(8),
              autoSleep: nanoid(8),
              flags: nanoid(8)
            };
            const leagueOptions: [string, string][] = [
              ['none', 'No minimum'],
              ...Object.entries(PLAYER_LEAGUE_MAP).slice(-24)
            ];
            const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Apply Rules');
            modal.addLabelComponents(
              new LabelBuilder().setLabel('Minimum TH level').setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId(customIds.th)
                  .setStyle(TextInputStyle.Short)
                  .setMaxLength(2)
                  .setRequired(false)
                  .setValue(btn.thMin != null ? String(btn.thMin) : '')
              ),
              new LabelBuilder().setLabel('Minimum trophies').setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId(customIds.trophies)
                  .setStyle(TextInputStyle.Short)
                  .setMaxLength(6)
                  .setRequired(false)
                  .setValue(btn.minTrophies != null ? String(btn.minTrophies) : '')
              ),
              new LabelBuilder().setLabel('Minimum league tier').setStringSelectMenuComponent(
                new StringSelectMenuBuilder().setCustomId(customIds.league).setOptions(
                  ...leagueOptions.map(([value, label]) =>
                    new StringSelectMenuOptionBuilder()
                      .setLabel(label)
                      .setValue(value)
                      .setDefault(
                        value === 'none' ? !btn.minLeagueTier : btn.minLeagueTier === value
                      )
                  )
                )
              ),
              new LabelBuilder().setLabel('Auto-sleep after inactivity').setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId(customIds.autoSleep)
                  .setStyle(TextInputStyle.Short)
                  .setMaxLength(3)
                  .setRequired(false)
                  .setValue(btn.autoSleepHours != null ? String(btn.autoSleepHours) : '')
              ),
              new LabelBuilder().setLabel('Options').setCheckboxGroupComponent(
                new CheckboxGroupBuilder().setCustomId(customIds.flags).addOptions(
                  new CheckboxGroupOptionBuilder()
                    .setLabel('Linked account required')
                    .setValue('require_linked')
                    .setDefault(btn.requireLinkedAccount),
                  new CheckboxGroupOptionBuilder()
                    .setLabel('Create staff thread')
                    .setValue('staff_thread')
                    .setDefault(btn.createStaffThread),
                  new CheckboxGroupOptionBuilder()
                    .setLabel('Allow claiming')
                    .setValue('allow_claim')
                    .setDefault(btn.allowClaim ?? false)
                )
              )
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === customIds.modal
            });
            const thRaw = submit.fields.getTextInputValue(customIds.th);
            const trophiesRaw = submit.fields.getTextInputValue(customIds.trophies);
            const autoSleepRaw = submit.fields.getTextInputValue(customIds.autoSleep);
            const leagueTier = submit.fields.getStringSelectValues(customIds.league)?.[0];
            const flags = submit.fields.getCheckboxGroup(customIds.flags);
            const requireLinkedAccount = flags.includes('require_linked');
            const createStaffThread = flags.includes('staff_thread');
            const allowClaim = flags.includes('allow_claim');
            await updateTicketType({
              thMin: thRaw ? parseInt(thRaw) || undefined : undefined,
              minTrophies: trophiesRaw ? parseInt(trophiesRaw) || undefined : undefined,
              autoSleepHours: autoSleepRaw ? parseInt(autoSleepRaw) || undefined : undefined,
              minLeagueTier: leagueTier === 'none' ? undefined : leagueTier,
              requireLinkedAccount,
              createStaffThread,
              allowClaim: allowClaim || undefined
            });
            await submit.deferUpdate();
            this.client.components.delete(customIds.modal);
          } else if (action.customId === ids.editQuestions) {
            const customIds = {
              modal: this.client.uuid(action.user.id),
              q1: nanoid(8),
              q2: nanoid(8),
              q3: nanoid(8),
              q4: nanoid(8),
              q5: nanoid(8)
            };
            const existing = btn.questions ?? [];
            const modal = new ModalBuilder()
              .setCustomId(customIds.modal)
              .setTitle('Questions (up to 5)');
            const makeQ = (id: string, n: number) => {
              const inp = new TextInputBuilder()
                .setCustomId(id)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(256)
                .setRequired(false);
              if (existing[n - 1]) inp.setValue(existing[n - 1].label);
              return new LabelBuilder()
                .setLabel(`Question ${n} (leave blank to remove)`)
                .setTextInputComponent(inp);
            };
            modal.addLabelComponents(
              makeQ(customIds.q1, 1),
              makeQ(customIds.q2, 2),
              makeQ(customIds.q3, 3),
              makeQ(customIds.q4, 4),
              makeQ(customIds.q5, 5)
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === customIds.modal
            });
            const questions = [
              submit.fields.getTextInputValue(customIds.q1),
              submit.fields.getTextInputValue(customIds.q2),
              submit.fields.getTextInputValue(customIds.q3),
              submit.fields.getTextInputValue(customIds.q4),
              submit.fields.getTextInputValue(customIds.q5)
            ]
              .filter(Boolean)
              .map((label) => ({ label, required: true }));
            await updateTicketType({ questions });
            await submit.deferUpdate();
            this.client.components.delete(customIds.modal);
          } else if (action.customId === ids.editCategories) {
            currentPanel = await this.editTicketTypeCategoriesModal(
              action as unknown as ButtonInteraction<'cached'>,
              currentPanel,
              buttonId
            );
            btn = currentPanel.ticketTypes.find((b) => b.id === buttonId)!;
          } else if (action.customId === ids.editNaming) {
            const customIds = {
              modal: this.client.uuid(action.user.id),
              naming: nanoid(8)
            };
            const modal = new ModalBuilder()
              .setCustomId(customIds.modal)
              .setTitle('Channel Naming');
            modal.addLabelComponents(
              new LabelBuilder().setLabel('Naming convention').setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId(customIds.naming)
                  .setStyle(TextInputStyle.Short)
                  .setMaxLength(64)
                  .setRequired(true)
                  .setPlaceholder('ticket-{count}')
                  .setValue(btn.namingConvention || DEFAULT_NAMING)
              )
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === customIds.modal
            });
            await updateTicketType({
              namingConvention: submit.fields.getTextInputValue(customIds.naming) || DEFAULT_NAMING
            });
            await submit.deferUpdate();
            this.client.components.delete(customIds.modal);
          }
        } catch (error) {
          if (
            !(
              error instanceof DiscordjsError &&
              error.code === DiscordjsErrorCodes.InteractionCollectorError
            )
          )
            throw error;
        }

        if (btn) {
          await interaction
            .editReply({ components: [renderBtn(btn)], flags: MessageFlags.IsComponentsV2 })
            .catch(() => null);
        }
      });

      collector.on('end', (_unused_args) => {
        Object.values(ids).forEach((id) => this.client.components.delete(id));
        resolve(currentPanel);
      });
    });
  }

  private async editTicketTypeRolesModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>,
    buttonId: string,
    btn: TicketTypeConfig
  ): Promise<WithId<TicketPanelEntity>> {
    const customIds = {
      modal: this.client.uuid(action.user.id),
      ping: nanoid(8),
      view: nanoid(8),
      add: nanoid(8),
      remove: nanoid(8)
    };

    const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Edit Staff Roles');
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Ping roles (get notified + access)').setRoleSelectMenuComponent(
        new RoleSelectMenuBuilder()
          .setCustomId(customIds.ping)
          .setRequired(false)
          .setMaxValues(10)
          .setDefaultRoles(btn.pingRoleIds ?? [])
      ),
      new LabelBuilder().setLabel('Viewer roles (can see but not ping)').setRoleSelectMenuComponent(
        new RoleSelectMenuBuilder()
          .setCustomId(customIds.view)
          .setRequired(false)
          .setMaxValues(10)
          .setDefaultRoles(btn.viewOnlyRoleIds ?? [])
      ),
      new LabelBuilder().setLabel('Roles to add to ticket creator').setRoleSelectMenuComponent(
        new RoleSelectMenuBuilder()
          .setCustomId(customIds.add)
          .setRequired(false)
          .setMaxValues(10)
          .setDefaultRoles(btn.addRoleIds ?? [])
      ),
      new LabelBuilder().setLabel('Roles to remove from ticket creator').setRoleSelectMenuComponent(
        new RoleSelectMenuBuilder()
          .setCustomId(customIds.remove)
          .setRequired(false)
          .setMaxValues(10)
          .setDefaultRoles(btn.removeRoleIds ?? [])
      )
    );

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === customIds.modal
    });

    const pingRoleIds = submit.fields.getSelectedRoles(customIds.ping)?.map((r) => r.id) ?? [];
    const viewOnlyRoleIds = submit.fields.getSelectedRoles(customIds.view)?.map((r) => r.id) ?? [];
    const addRoleIds = submit.fields.getSelectedRoles(customIds.add)?.map((r) => r.id) ?? [];
    const removeRoleIds = submit.fields.getSelectedRoles(customIds.remove)?.map((r) => r.id) ?? [];

    await this.ticketPanels.updateOne(
      { '_id': panel._id, 'ticketTypes.id': buttonId },
      {
        $set: {
          'ticketTypes.$.pingRoleIds': pingRoleIds,
          'ticketTypes.$.viewOnlyRoleIds': viewOnlyRoleIds,
          'ticketTypes.$.addRoleIds': addRoleIds,
          'ticketTypes.$.removeRoleIds': removeRoleIds,
          'updatedAt': new Date()
        }
      }
    );

    await submit.deferUpdate();
    this.client.components.delete(customIds.modal);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editSavedRepliesFlow(
    interaction: CommandInteraction<'cached'>,
    guildId: string
  ): Promise<void> {
    const getSettings = () => this.ticketGuildSettings.findOne({ guildId });

    let settings = await getSettings();
    let templates = settings?.savedReplies ?? [];

    const staticIds = {
      addReply: this.client.uuid(interaction.user.id),
      back: this.client.uuid(interaction.user.id)
    };

    const perReplyIds = new Map<string, { edit: string }>();
    const getOrCreateReplyIds = (replyName: string) => {
      if (!perReplyIds.has(replyName)) {
        perReplyIds.set(replyName, { edit: this.client.uuid(interaction.user.id) });
      }
      return perReplyIds.get(replyName)!;
    };

    for (const t of templates) getOrCreateReplyIds(t.name);

    const saveTemplates = async (updated: { name: string; content: string }[]) => {
      await this.ticketGuildSettings.updateOne(
        { guildId },
        { $set: { savedReplies: updated, updatedAt: new Date() } },
        { upsert: true }
      );
      settings = await getSettings();
      templates = settings?.savedReplies ?? [];
    };

    const renderRepliesMenu = () => {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '## Saved Replies',
            'Pre-written messages shared across all panels and application types in this server.',
            templates.length === 0
              ? '-# No saved replies yet — click **Add Reply** to create your first one.'
              : `-# Click **Edit / Delete** next to a reply to edit or remove it. Up to **25 replies** per server.`,
            '',
            '**Supported variables:**',
            SAVED_REPLY_VARIABLES.map((v) => `\`{${v}}\``).join(' ')
          ].join('\n')
        )
      );
      container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));

      for (const template of templates) {
        const replyIds = getOrCreateReplyIds(template.name);
        const preview =
          template.content.length > 80 ? template.content.slice(0, 80) + '…' : template.content;
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**${template.name}**\n${preview}`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(replyIds.edit)
                .setLabel('Edit / Delete')
                .setStyle(ButtonStyle.Secondary)
            )
        );
        container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));
      }

      container.addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(staticIds.addReply)
            .setLabel('Add Reply')
            .setStyle(ButtonStyle.Success)
            .setDisabled(templates.length >= 25),
          new ButtonBuilder()
            .setCustomId(staticIds.back)
            .setLabel('Back')
            .setStyle(ButtonStyle.Primary)
        )
      );

      return container;
    };

    await interaction.editReply({
      components: [renderRepliesMenu()],
      flags: MessageFlags.IsComponentsV2
    });

    return new Promise<void>((resolve) => {
      const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button>({
        filter: (a) => {
          const allIds = [
            ...Object.values(staticIds),
            ...[...perReplyIds.values()].map((v) => v.edit)
          ];
          return allIds.includes(a.customId) && a.user.id === interaction.user.id;
        },
        time: 5 * 60 * 1000
      });

      collector.on('collect', async (action) => {
        if (action.customId === staticIds.back) {
          await action.deferUpdate();
          collector.stop('back');
          return;
        }

        try {
          if (action.customId === staticIds.addReply) {
            if (templates.length >= 25) {
              await action.deferUpdate();
              return;
            }
            const customIds = {
              modal: this.client.uuid(action.user.id),
              name: nanoid(8),
              content: nanoid(8)
            };
            const modal = new ModalBuilder()
              .setCustomId(customIds.modal)
              .setTitle('Add Saved Reply');
            modal.addLabelComponents(
              new LabelBuilder()
                .setLabel('Reply name')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(customIds.name)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(64)
                    .setRequired(true)
                    .setPlaceholder('e.g. Approved, Denied, Welcome')
                ),
              new LabelBuilder()
                .setLabel('Reply content (supports variables)')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(customIds.content)
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(1800)
                    .setRequired(true)
                    .setPlaceholder(
                      'Hi {user_mention}, your application has been approved!\nClan: {clan_name}'
                    )
                )
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === customIds.modal
            });
            const name = submit.fields.getTextInputValue(customIds.name).trim();
            const content = submit.fields.getTextInputValue(customIds.content).trim();
            if (name && content && !templates.some((t) => t.name === name)) {
              await saveTemplates([...templates, { name, content }]);
              getOrCreateReplyIds(name);
            }
            await submit.deferUpdate();
            this.client.components.delete(customIds.modal);
          } else {
            for (const [replyName, replyIds] of perReplyIds.entries()) {
              if (action.customId === replyIds.edit) {
                const template = templates.find((t) => t.name === replyName);
                if (!template) break;

                const customIds = {
                  modal: this.client.uuid(action.user.id),
                  name: nanoid(8),
                  content: nanoid(8),
                  delete: nanoid(8)
                };
                const modal = new ModalBuilder()
                  .setCustomId(customIds.modal)
                  .setTitle('Edit Saved Reply');
                modal.addLabelComponents(
                  new LabelBuilder()
                    .setLabel('Reply name')
                    .setTextInputComponent(
                      new TextInputBuilder()
                        .setCustomId(customIds.name)
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(64)
                        .setRequired(true)
                        .setValue(template.name)
                    ),
                  new LabelBuilder()
                    .setLabel('Reply content (supports variables)')
                    .setTextInputComponent(
                      new TextInputBuilder()
                        .setCustomId(customIds.content)
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(1800)
                        .setRequired(true)
                        .setValue(template.content)
                    ),
                  new LabelBuilder()
                    .setLabel('Delete this reply?')
                    .setCheckboxGroupComponent(
                      new CheckboxGroupBuilder()
                        .setCustomId(customIds.delete)
                        .setRequired(false)
                        .addOptions(
                          new CheckboxGroupOptionBuilder()
                            .setLabel('Yes, delete this reply')
                            .setValue('delete')
                            .setDefault(false)
                        )
                    )
                );
                await action.showModal(modal);
                const submit = await action.awaitModalSubmit({
                  time: 5 * 60 * 1000,
                  filter: (a) => a.customId === customIds.modal
                });
                const shouldDelete = submit.fields
                  .getCheckboxGroup(customIds.delete)
                  .includes('delete');
                if (shouldDelete) {
                  await saveTemplates(templates.filter((t) => t.name !== replyName));
                  perReplyIds.delete(replyName);
                } else {
                  const newName = submit.fields.getTextInputValue(customIds.name).trim();
                  const newContent = submit.fields.getTextInputValue(customIds.content).trim();
                  const nameConflict =
                    newName !== replyName && templates.some((t) => t.name === newName);
                  if (newName && newContent && !nameConflict) {
                    await saveTemplates(
                      templates.map((t) =>
                        t.name === replyName ? { name: newName, content: newContent } : t
                      )
                    );
                    if (newName !== replyName) {
                      perReplyIds.delete(replyName);
                      getOrCreateReplyIds(newName);
                    }
                  }
                }
                await submit.deferUpdate();
                this.client.components.delete(customIds.modal);
                break;
              }
            }
          }
        } catch (error) {
          if (
            !(
              error instanceof DiscordjsError &&
              error.code === DiscordjsErrorCodes.InteractionCollectorError
            )
          )
            throw error;
        }

        await interaction
          .editReply({
            components: [renderRepliesMenu()],
            flags: MessageFlags.IsComponentsV2
          })
          .catch(() => null);
      });

      collector.on('end', () => {
        Object.values(staticIds).forEach((id) => this.client.components.delete(id));
        resolve();
      });
    });
  }

  private async editTicketTypeCategoriesModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>,
    buttonId: string
  ): Promise<WithId<TicketPanelEntity>> {
    const btn = panel.ticketTypes.find((b) => b.id === buttonId);
    if (!btn) return panel;

    const customIds = {
      modal: this.client.uuid(action.user.id),
      open: nanoid(8),
      sleep: nanoid(8),
      closed: nanoid(8)
    };

    const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Edit Categories');
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Open tickets category').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(customIds.open)
          .setChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(btn.openCategoryId ? [btn.openCategoryId] : [])
      ),
      new LabelBuilder().setLabel('Sleeping tickets category').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(customIds.sleep)
          .setChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(btn.sleepCategoryId ? [btn.sleepCategoryId] : [])
      ),
      new LabelBuilder().setLabel('Closed tickets category').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(customIds.closed)
          .setChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(btn.closedCategoryId ? [btn.closedCategoryId] : [])
      )
    );

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === customIds.modal
    });

    const openCategoryId = submit.fields.getSelectedChannels(customIds.open)?.first()?.id ?? null;
    const sleepCategoryId = submit.fields.getSelectedChannels(customIds.sleep)?.first()?.id ?? null;
    const closedCategoryId =
      submit.fields.getSelectedChannels(customIds.closed)?.first()?.id ?? null;

    await this.ticketPanels.updateOne(
      { '_id': panel._id, 'ticketTypes.id': buttonId },
      {
        $set: {
          'ticketTypes.$.openCategoryId': openCategoryId,
          'ticketTypes.$.sleepCategoryId': sleepCategoryId,
          'ticketTypes.$.closedCategoryId': closedCategoryId,
          'updatedAt': new Date()
        }
      }
    );

    await submit.deferUpdate();
    this.client.components.delete(customIds.modal);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editLoggingModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ): Promise<WithId<TicketPanelEntity>> {
    const customIds = {
      modal: this.client.uuid(action.user.id),
      buttonClick: nanoid(8),
      statusChange: nanoid(8),
      ticketClose: nanoid(8)
    };

    const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Edit Logging Channels');
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Button click log channel').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(customIds.buttonClick)
          .setChannelTypes(ChannelType.GuildText)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(panel.logChannels.buttonClick ? [panel.logChannels.buttonClick] : [])
      ),
      new LabelBuilder().setLabel('Status change log channel').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(customIds.statusChange)
          .setChannelTypes(ChannelType.GuildText)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(
            panel.logChannels.statusChange ? [panel.logChannels.statusChange] : []
          )
      ),
      new LabelBuilder().setLabel('Ticket close log channel').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(customIds.ticketClose)
          .setChannelTypes(ChannelType.GuildText)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(panel.logChannels.ticketClose ? [panel.logChannels.ticketClose] : [])
      )
    );

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === customIds.modal
    });

    const buttonClickChannel =
      submit.fields.getSelectedChannels(customIds.buttonClick)?.first()?.id ?? null;
    const statusChangeChannel =
      submit.fields.getSelectedChannels(customIds.statusChange)?.first()?.id ?? null;
    const ticketCloseChannel =
      submit.fields.getSelectedChannels(customIds.ticketClose)?.first()?.id ?? null;

    await this.ticketPanels.updateOne(
      { _id: panel._id },
      {
        $set: {
          'logChannels.buttonClick': buttonClickChannel,
          'logChannels.statusChange': statusChangeChannel,
          'logChannels.ticketClose': ticketCloseChannel,
          'updatedAt': new Date()
        }
      }
    );

    await submit.deferUpdate();
    this.client.components.delete(customIds.modal);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editExtraButtonsFlow(
    interaction: CommandInteraction<'cached'>,
    initialPanel: WithId<TicketPanelEntity>
  ): Promise<WithId<TicketPanelEntity>> {
    let currentPanel = initialPanel;

    const staticIds = {
      addCmdButton: this.client.uuid(interaction.user.id),
      addUrlButton: this.client.uuid(interaction.user.id),
      togglePlacement: this.client.uuid(interaction.user.id),
      back: this.client.uuid(interaction.user.id)
    };

    const perBtnIds = new Map<string, { edit: string }>();
    const getOrCreateBtnIds = (btnId: string) => {
      if (!perBtnIds.has(btnId)) {
        perBtnIds.set(btnId, { edit: this.client.uuid(interaction.user.id) });
      }
      return perBtnIds.get(btnId)!;
    };

    for (const eb of currentPanel.extraButtons ?? []) getOrCreateBtnIds(eb.id);

    const saveExtraButtons = async (updated: NonNullable<TicketPanelEntity['extraButtons']>) => {
      await this.ticketPanels.updateOne(
        { _id: currentPanel._id },
        { $set: { extraButtons: updated, updatedAt: new Date() } }
      );
      currentPanel = (await this.getPanel(currentPanel.guildId, currentPanel.name)) ?? currentPanel;
    };

    const renderMenu = () => {
      const buttons = currentPanel.extraButtons ?? [];
      const placement = currentPanel.extraButtonsPlacement ?? 'row';

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '## Extra Buttons',
            'Additional buttons shown on the panel post alongside the Create Ticket button.',
            buttons.length === 0
              ? '-# No extra buttons yet.'
              : `-# Up to **10 extra buttons** (${buttons.length}/10 used).`
          ].join('\n')
        )
      );
      container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));

      for (const eb of buttons) {
        const ebIds = getOrCreateBtnIds(eb.id);
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `${eb.emoji ? `${eb.emoji} ` : ''}**${eb.label}** (${eb.url ? 'link' : eb.cmd})`
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(ebIds.edit)
                .setLabel('Edit / Delete')
                .setStyle(ButtonStyle.Secondary)
            )
        );
        container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));
      }

      container.addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(staticIds.addCmdButton)
            .setLabel('Add Command Button')
            .setStyle(ButtonStyle.Success)
            .setDisabled(buttons.length >= 10),
          new ButtonBuilder()
            .setCustomId(staticIds.addUrlButton)
            .setLabel('Add URL Button')
            .setStyle(ButtonStyle.Success)
            .setDisabled(buttons.length >= 10),
          new ButtonBuilder()
            .setCustomId(staticIds.togglePlacement)
            .setLabel(`Placement: ${placement === 'row' ? 'Same Row' : 'New Row'}`)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(staticIds.back)
            .setLabel('Back')
            .setStyle(ButtonStyle.Primary)
        )
      );

      return container;
    };

    await interaction.editReply({
      components: [renderMenu()],
      flags: MessageFlags.IsComponentsV2
    });

    return new Promise<WithId<TicketPanelEntity>>((resolve) => {
      const collector = interaction.channel!.createMessageComponentCollector<ComponentType.Button>({
        filter: (a) => {
          const allIds = [
            ...Object.values(staticIds),
            ...[...perBtnIds.values()].map((v) => v.edit)
          ];
          return allIds.includes(a.customId) && a.user.id === interaction.user.id;
        },
        time: 5 * 60 * 1000
      });

      collector.on('collect', async (action) => {
        if (action.customId === staticIds.back) {
          await action.deferUpdate();
          collector.stop('back');
          return;
        }

        try {
          if (action.customId === staticIds.togglePlacement) {
            await action.deferUpdate();
            const current = currentPanel.extraButtonsPlacement ?? 'row';
            await this.ticketPanels.updateOne(
              { _id: currentPanel._id },
              {
                $set: {
                  extraButtonsPlacement: current === 'row' ? 'col' : 'row',
                  updatedAt: new Date()
                }
              }
            );
            currentPanel =
              (await this.getPanel(currentPanel.guildId, currentPanel.name)) ?? currentPanel;
          } else if (action.customId === staticIds.addCmdButton) {
            const existing = currentPanel.extraButtons ?? [];
            if (existing.length >= 10) {
              await action.deferUpdate();
              return;
            }
            const customIds = {
              modal: this.client.uuid(action.user.id),
              preset: nanoid(8),
              label: nanoid(8),
              emoji: nanoid(8),
              style: nanoid(8)
            };
            const modal = new ModalBuilder()
              .setCustomId(customIds.modal)
              .setTitle('Add Command Button');
            modal.addLabelComponents(
              new LabelBuilder()
                .setLabel('Button Type')
                .setStringSelectMenuComponent(
                  new StringSelectMenuBuilder()
                    .setCustomId(customIds.preset)
                    .setOptions(
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Link Account')
                        .setValue('link-add')
                        .setDescription('Opens the link account flow for the user')
                    )
                ),
              new LabelBuilder()
                .setLabel('Label')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(customIds.label)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(80)
                    .setRequired(true)
                    .setPlaceholder('e.g. Link Account')
                ),
              new LabelBuilder()
                .setLabel('Emoji (optional)')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(customIds.emoji)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(56)
                    .setRequired(false)
                    .setPlaceholder('🔗')
                ),
              new LabelBuilder()
                .setLabel('Style')
                .setStringSelectMenuComponent(
                  new StringSelectMenuBuilder()
                    .setCustomId(customIds.style)
                    .setOptions(
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Primary')
                        .setValue('1')
                        .setDefault(false),
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Secondary')
                        .setValue('2')
                        .setDefault(true),
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Success')
                        .setValue('3')
                        .setDefault(false),
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Danger')
                        .setValue('4')
                        .setDefault(false)
                    )
                )
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === customIds.modal
            });
            const presetValue = submit.fields.getStringSelectValues(customIds.preset)?.[0];
            const label = submit.fields.getTextInputValue(customIds.label).trim();
            const emojiRaw = submit.fields.getTextInputValue(customIds.emoji);
            const emoji = emojiRaw && isValidEmoji(emojiRaw) ? emojiRaw : undefined;
            const styleVal = parseInt(
              submit.fields.getStringSelectValues(customIds.style)?.[0] ?? '2'
            );
            const style = [
              ButtonStyle.Primary,
              ButtonStyle.Secondary,
              ButtonStyle.Success,
              ButtonStyle.Danger
            ].includes(styleVal)
              ? styleVal
              : ButtonStyle.Secondary;
            if (label && presetValue === 'link-add') {
              const newBtn = {
                id: nanoid(8),
                label,
                emoji,
                style,
                cmd: 'link-add',
                args: { token_field: 'required' }
              };
              await saveExtraButtons([...existing, newBtn]);
              getOrCreateBtnIds(newBtn.id);
            }
            await submit.deferUpdate();
            this.client.components.delete(customIds.modal);
          } else if (action.customId === staticIds.addUrlButton) {
            const existing = currentPanel.extraButtons ?? [];
            if (existing.length >= 10) {
              await action.deferUpdate();
              return;
            }
            const customIds = {
              modal: this.client.uuid(action.user.id),
              label: nanoid(8),
              emoji: nanoid(8),
              url: nanoid(8)
            };
            const modal = new ModalBuilder()
              .setCustomId(customIds.modal)
              .setTitle('Add URL Button');
            modal.addLabelComponents(
              new LabelBuilder()
                .setLabel('Label')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(customIds.label)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(80)
                    .setRequired(true)
                    .setPlaceholder('e.g. Rules')
                ),
              new LabelBuilder()
                .setLabel('Emoji (optional)')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(customIds.emoji)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(56)
                    .setRequired(false)
                    .setPlaceholder('📋')
                ),
              new LabelBuilder()
                .setLabel('URL')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(customIds.url)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(256)
                    .setRequired(true)
                    .setPlaceholder('https://example.com/rules')
                )
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === customIds.modal
            });
            const label = submit.fields.getTextInputValue(customIds.label).trim();
            const emojiRaw = submit.fields.getTextInputValue(customIds.emoji);
            const emoji = emojiRaw && isValidEmoji(emojiRaw) ? emojiRaw : undefined;
            const url = submit.fields.getTextInputValue(customIds.url).trim();
            if (label && url) {
              const newBtn = { id: nanoid(8), label, emoji, url };
              await saveExtraButtons([...existing, newBtn]);
              getOrCreateBtnIds(newBtn.id);
            }
            await submit.deferUpdate();
            this.client.components.delete(customIds.modal);
          } else {
            for (const [btnId, ebIds] of perBtnIds.entries()) {
              if (action.customId !== ebIds.edit) continue;
              const existing = currentPanel.extraButtons ?? [];
              const eb = existing.find((b) => b.id === btnId);
              if (!eb) break;

              const customIds = {
                modal: this.client.uuid(action.user.id),
                label: nanoid(8),
                emoji: nanoid(8),
                style: nanoid(8),
                url: nanoid(8),
                delete: nanoid(8)
              };

              const labelInput = new TextInputBuilder()
                .setCustomId(customIds.label)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(80)
                .setRequired(true)
                .setValue(eb.label);
              const emojiInput = new TextInputBuilder()
                .setCustomId(customIds.emoji)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(56)
                .setRequired(false);
              if (eb.emoji) emojiInput.setValue(eb.emoji);

              const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Edit Button');

              if (eb.cmd) {
                modal.addLabelComponents(
                  new LabelBuilder().setLabel('Label').setTextInputComponent(labelInput),
                  new LabelBuilder().setLabel('Emoji (optional)').setTextInputComponent(emojiInput),
                  new LabelBuilder().setLabel('Style').setStringSelectMenuComponent(
                    new StringSelectMenuBuilder().setCustomId(customIds.style).setOptions(
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Primary')
                        .setValue('1')
                        .setDefault(eb.style === ButtonStyle.Primary),
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Secondary')
                        .setValue('2')
                        .setDefault(!eb.style || eb.style === ButtonStyle.Secondary),
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Success')
                        .setValue('3')
                        .setDefault(eb.style === ButtonStyle.Success),
                      new StringSelectMenuOptionBuilder()
                        .setLabel('Danger')
                        .setValue('4')
                        .setDefault(eb.style === ButtonStyle.Danger)
                    )
                  ),
                  new LabelBuilder()
                    .setLabel('Delete this button?')
                    .setCheckboxGroupComponent(
                      new CheckboxGroupBuilder()
                        .setCustomId(customIds.delete)
                        .addOptions(
                          new CheckboxGroupOptionBuilder()
                            .setLabel('Yes, delete this button')
                            .setValue('delete')
                            .setDefault(false)
                        )
                    )
                );
              } else {
                const urlInput = new TextInputBuilder()
                  .setCustomId(customIds.url)
                  .setStyle(TextInputStyle.Short)
                  .setMaxLength(256)
                  .setRequired(true);
                if (eb.url) urlInput.setValue(eb.url);
                modal.addLabelComponents(
                  new LabelBuilder().setLabel('Label').setTextInputComponent(labelInput),
                  new LabelBuilder().setLabel('Emoji (optional)').setTextInputComponent(emojiInput),
                  new LabelBuilder().setLabel('URL').setTextInputComponent(urlInput),
                  new LabelBuilder()
                    .setLabel('Delete this button?')
                    .setCheckboxGroupComponent(
                      new CheckboxGroupBuilder()
                        .setCustomId(customIds.delete)
                        .addOptions(
                          new CheckboxGroupOptionBuilder()
                            .setLabel('Yes, delete this button')
                            .setValue('delete')
                            .setDefault(false)
                        )
                    )
                );
              }

              await action.showModal(modal);
              const submit = await action.awaitModalSubmit({
                time: 5 * 60 * 1000,
                filter: (a) => a.customId === customIds.modal
              });

              const shouldDelete = submit.fields
                .getCheckboxGroup(customIds.delete)
                .includes('delete');
              if (shouldDelete) {
                await saveExtraButtons(existing.filter((b) => b.id !== btnId));
                perBtnIds.delete(btnId);
              } else {
                const newLabel =
                  submit.fields.getTextInputValue(customIds.label).trim() || eb.label;
                const newEmojiRaw = submit.fields.getTextInputValue(customIds.emoji);
                const newEmoji = newEmojiRaw && isValidEmoji(newEmojiRaw) ? newEmojiRaw : undefined;
                let newStyle = eb.style;
                let newUrl = eb.url;
                if (eb.cmd) {
                  const sv = parseInt(
                    submit.fields.getStringSelectValues(customIds.style)?.[0] ?? '2'
                  );
                  newStyle = [
                    ButtonStyle.Primary,
                    ButtonStyle.Secondary,
                    ButtonStyle.Success,
                    ButtonStyle.Danger
                  ].includes(sv)
                    ? sv
                    : ButtonStyle.Secondary;
                } else {
                  newUrl = submit.fields.getTextInputValue(customIds.url).trim() || eb.url;
                }
                await saveExtraButtons(
                  existing.map((b) =>
                    b.id === btnId
                      ? { ...b, label: newLabel, emoji: newEmoji, style: newStyle, url: newUrl }
                      : b
                  )
                );
              }
              await submit.deferUpdate();
              this.client.components.delete(customIds.modal);
              break;
            }
          }
        } catch (error) {
          if (
            !(
              error instanceof DiscordjsError &&
              error.code === DiscordjsErrorCodes.InteractionCollectorError
            )
          )
            throw error;
        }

        await interaction
          .editReply({ components: [renderMenu()], flags: MessageFlags.IsComponentsV2 })
          .catch(() => null);
      });

      collector.on('end', () => {
        [...Object.values(staticIds), ...[...perBtnIds.values()].map((v) => v.edit)].forEach((id) =>
          this.client.components.delete(id)
        );
        resolve(currentPanel);
      });
    });
  }

  // =================== UTILITY ===================

  public getPanel(guildId: string, name: string) {
    return this.client.tickets.getPanel(guildId, name);
  }
}
