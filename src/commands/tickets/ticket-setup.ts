import { Collections } from '@app/constants';
import { TicketGuildSettingsEntity, TicketPanelEntity, TicketTypeConfig } from '@app/entities';
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
import { Args, Command } from '../../lib/handlers.js';

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

  public args(): Args {
    return {
      panel_name: { match: 'STRING' }
    };
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
      const insertResult = await this.client.db
        .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
        .insertOne({
          _id: new ObjectId(),
          guildId: interaction.guildId,
          name: panelName,
          embed: { ...DEFAULT_EMBED },
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
      panel = await this.client.db
        .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
        .findOne({ _id: insertResult.insertedId });
    }

    if (!panel) return interaction.editReply({ content: 'Failed to load panel.' });

    const ids = this.makeDashboardIds(interaction.user.id);

    await interaction.editReply({
      components: [this.buildDashboard(panel, ids)],
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
        } else if (action.customId === ids.editStaffRoles) {
          if (panel!.ticketTypes.length > 0) {
            const firstBtn = panel!.ticketTypes[0];
            panel = await this.editTicketTypeRolesModal(btn, panel!, firstBtn.id, firstBtn);
          } else {
            await action.deferUpdate();
          }
        } else if (action.customId === ids.editRules) {
          await this.editRulesModal(btn, panel!);
          panel = (await this.getPanel(panel!.guildId, panel!.name)) ?? panel;
        } else if (action.customId === ids.editQuestions) {
          await this.editQuestionsModal(btn, panel!);
          panel = (await this.getPanel(panel!.guildId, panel!.name)) ?? panel;
        } else if (action.customId === ids.editMessages) {
          await action.deferUpdate();
          await this.editSavedRepliesFlow(interaction, panel!.guildId);
        } else if (action.customId === ids.editCategories) {
          if (panel!.ticketTypes.length > 0) {
            panel = await this.editTicketTypeCategoriesModal(btn, panel!, panel!.ticketTypes[0].id);
          } else {
            await action.deferUpdate();
          }
        } else if (action.customId === ids.editNaming) {
          await this.editNamingModal(btn, panel!);
          panel = (await this.getPanel(panel!.guildId, panel!.name)) ?? panel;
        } else if (action.customId === ids.editLogging) {
          panel = await this.editLoggingModal(btn, panel!);
        }
      } catch (e) {
        if (
          e instanceof DiscordjsError &&
          e.code === DiscordjsErrorCodes.InteractionCollectorError
        ) {
          // Timed out — ignore
        } else {
          throw e;
        }
      }

      if (panel) {
        await interaction
          .editReply({
            components: [this.buildDashboard(panel, ids)],
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
      editStaffRoles: this.client.uuid(userId),
      editRules: this.client.uuid(userId),
      editQuestions: this.client.uuid(userId),
      editMessages: this.client.uuid(userId),
      editCategories: this.client.uuid(userId),
      editNaming: this.client.uuid(userId),
      editLogging: this.client.uuid(userId),
      done: this.client.uuid(userId)
    };
  }

  private buildDashboard(
    panel: WithId<TicketPanelEntity>,
    ids: ReturnType<typeof this.makeDashboardIds>
  ) {
    const firstBtn = panel.ticketTypes[0];
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
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📝 Embed\n${embedText}`))
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editEmbed)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Create Ticket button section
    const panelButtonText = [
      `**Label:** ${panel.button?.label ?? 'Create Ticket'}`,
      `**Emoji:** ${panel.button?.emoji ?? '*(none)*'}`,
      `**Style:** ${panel.button?.style != null ? (ButtonStyle[panel.button.style] ?? panel.button.style) : 'Primary'}`
    ].join(' | ');
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### 🎫 Create Ticket Button\n${panelButtonText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editPanelButton)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Application Types section
    const appTypesText =
      panel.ticketTypes.length === 0
        ? '*(no application types)*'
        : panel.ticketTypes
            .map((b) => `- ${b.emoji ? `${b.emoji} ` : ''}**${b.label}**`)
            .join('\n');
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### 🗂️ Application Types\n${appTypesText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editTicketTypes)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Staff roles
    const staffText = firstBtn
      ? [
          `**Ping:** ${firstBtn.pingRoleIds.length ? firstBtn.pingRoleIds.map((id) => `<@&${id}>`).join(', ') : '*(none)*'}`,
          `**View-only:** ${firstBtn.viewOnlyRoleIds.length ? firstBtn.viewOnlyRoleIds.map((id) => `<@&${id}>`).join(', ') : '*(none)*'}`
        ].join('\n')
      : '*(configure a button first)*';
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### 👥 Staff Roles\n${staffText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editStaffRoles)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Apply rules
    const rulesText = firstBtn
      ? [
          `**TH min:** ${firstBtn.thMin ?? '*(none)*'} | **Max accounts:** ${firstBtn.maxAccounts ?? '*(unlimited)*'} | **Min war stars:** ${firstBtn.minWarStars ?? '*(none)*'}`,
          `**Require linked account:** ${firstBtn.requireLinkedAccount ? 'Yes' : 'No'}`
        ].join('\n')
      : '*(configure a button first)*';
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### 📋 Apply Rules\n${rulesText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editRules)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Questions
    const questionsText = firstBtn
      ? firstBtn.questions?.length
        ? firstBtn.questions.map((q, i) => `${i + 1}. ${q.label}`).join('\n')
        : '*(no questions)*'
      : '*(configure a button first)*';
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### ❓ Questions\n${questionsText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editQuestions)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Messages
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 💬 Saved Replies\nPre-written messages shared across all application types in this server.`
          )
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editMessages)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Categories
    const catsText = firstBtn
      ? [
          `**Open:** ${firstBtn.openCategoryId ? `<#${firstBtn.openCategoryId}>` : '*(not set)*'}`,
          `**Sleep:** ${firstBtn.sleepCategoryId ? `<#${firstBtn.sleepCategoryId}>` : '*(not set)*'}`,
          `**Closed:** ${firstBtn.closedCategoryId ? `<#${firstBtn.closedCategoryId}>` : '*(not set)*'}`
        ].join('\n')
      : '*(configure a button first)*';
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### 📂 Categories\n${catsText}`)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editCategories)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Naming
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🏷️ Naming\n\`${firstBtn?.namingConvention ?? DEFAULT_NAMING}\``
          )
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editNaming)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary)
        )
    );

    // Logging
    const logText = [
      `**Button click:** ${panel.logChannels.buttonClick ? `<#${panel.logChannels.buttonClick}>` : '*(not set)*'}`,
      `**Status change:** ${panel.logChannels.statusChange ? `<#${panel.logChannels.statusChange}>` : '*(not set)*'}`,
      `**Ticket close:** ${panel.logChannels.ticketClose ? `<#${panel.logChannels.ticketClose}>` : '*(not set)*'}`
    ].join('\n');
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📣 Logging\n${logText}`))
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(ids.editLogging)
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
    } else if (firstBtn && firstBtn.pingRoleIds.length === 0) {
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
    const modalId = this.client.uuid(action.user.id);
    const titleId = nanoid(8);
    const descId = nanoid(8);
    const colorId = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Edit Panel Embed');

    const titleInput = new TextInputBuilder()
      .setCustomId(titleId)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setRequired(false)
      .setPlaceholder('Enter embed title');
    if (panel.embed.title) titleInput.setValue(panel.embed.title);

    const descInput = new TextInputBuilder()
      .setCustomId(descId)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(2000)
      .setRequired(false)
      .setPlaceholder('Enter embed description (markdown supported)');
    if (panel.embed.description) descInput.setValue(panel.embed.description);

    const colorInput = new TextInputBuilder()
      .setCustomId(colorId)
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
      filter: (a) => a.customId === modalId
    });

    const title = submit.fields.getTextInputValue(titleId) || undefined;
    const description = submit.fields.getTextInputValue(descId) || undefined;
    const colorRaw = submit.fields.getTextInputValue(colorId);
    const color = colorRaw ? parseInt(colorRaw.replace('#', ''), 16) || undefined : undefined;

    await this.client.db.collection<TicketPanelEntity>(Collections.TICKET_PANELS).updateOne(
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
    this.client.components.delete(modalId);
  }

  private async editPanelButtonModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ): Promise<WithId<TicketPanelEntity>> {
    const modalId = this.client.uuid(action.user.id);
    const labelId = nanoid(8);
    const emojiId = nanoid(8);
    const styleId = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Edit Create Ticket Button');
    const current = panel.button ?? {
      label: 'Create Ticket',
      emoji: '📩',
      style: ButtonStyle.Primary
    };
    const labelInput = new TextInputBuilder()
      .setCustomId(labelId)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(80)
      .setRequired(true)
      .setValue(current.label);
    const emojiInput = new TextInputBuilder()
      .setCustomId(emojiId)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(32)
      .setRequired(false);
    if (current.emoji) emojiInput.setValue(current.emoji);

    modal.addLabelComponents(
      new LabelBuilder().setLabel('Button Label').setTextInputComponent(labelInput),
      new LabelBuilder().setLabel('Emoji (optional)').setTextInputComponent(emojiInput),
      new LabelBuilder().setLabel('Style').setStringSelectMenuComponent(
        new StringSelectMenuBuilder().setCustomId(styleId).setOptions(
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
      filter: (a) => a.customId === modalId
    });

    const label = submit.fields.getTextInputValue(labelId) || current.label;
    const emoji = submit.fields.getTextInputValue(emojiId) || undefined;
    const styleVal = parseInt(submit.fields.getStringSelectValues(styleId)?.[0] ?? '1');
    const style = [
      ButtonStyle.Primary,
      ButtonStyle.Secondary,
      ButtonStyle.Success,
      ButtonStyle.Danger
    ].includes(styleVal)
      ? styleVal
      : ButtonStyle.Primary;

    await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .updateOne(
        { _id: panel._id },
        { $set: { button: { label, emoji, style }, updatedAt: new Date() } }
      );

    await submit.deferUpdate();
    this.client.components.delete(modalId);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editTicketTypesFlow(
    interaction: CommandInteraction<'cached'>,
    triggerAction: MessageComponentInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ): Promise<WithId<TicketPanelEntity>> {
    const staticIds = {
      addButton: this.client.uuid(interaction.user.id),
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
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '## Application Types',
            'Each type appears as a select menu option when a user clicks the "Create Ticket" button. You can have up to **25 types** per panel.',
            currentPanel.ticketTypes.length === 0
              ? '-# No types yet — click **Add Type** to create your first one.'
              : `-# Click **Edit / Delete** next to a type to edit its settings or remove it.`
          ].join('\n')
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
                  `Ping: ${b.pingRoleIds.length ? b.pingRoleIds.map((r) => `<@&${r}>`).join(', ') : '*none*'} | Questions: ${b.questions?.length ?? 0}`,
                  `TH min: ${b.thMin ?? '*-*'} | Max accounts: ${b.maxAccounts ?? '*unlimited*'} | Require linked: ${b.requireLinkedAccount ? 'Yes' : 'No'}`
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

      container.addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(staticIds.addButton)
            .setLabel('Add Type')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success)
            .setDisabled(currentPanel.ticketTypes.length >= 25),
          new ButtonBuilder()
            .setCustomId(staticIds.back)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
        )
      );
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

        if (action.customId === staticIds.addButton) {
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
    const modalId = this.client.uuid(action.user.id);
    const labelId = nanoid(8);
    const emojiId = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Add Application Type');
    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel('Label')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(labelId)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(80)
            .setRequired(true)
            .setPlaceholder('e.g. Clan Application, Support Ticket')
        ),
      new LabelBuilder()
        .setLabel('Emoji (optional, e.g. 🎫 or :emoji_name:)')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(emojiId)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(32)
            .setRequired(false)
            .setPlaceholder('📩')
        )
    );

    await action.showModal(modal);

    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === modalId
    });

    const label = submit.fields.getTextInputValue(labelId);
    const emoji = submit.fields.getTextInputValue(emojiId) || undefined;

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

    await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .updateOne(
        { _id: panel._id },
        { $push: { ticketTypes: newButton }, $set: { updatedAt: new Date() } }
      );

    await submit.deferUpdate();
    this.client.components.delete(modalId);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editSingleTicketTypeFlow(
    interaction: CommandInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>,
    buttonId: string
  ): Promise<WithId<TicketPanelEntity>> {
    let currentPanel = panel;
    let btn = currentPanel.ticketTypes.find((b) => b.id === buttonId);
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
              `## Edit Application Type: ${b.label}\n**Label:** ${b.label} | **Emoji:** ${b.emoji ?? '*(none)*'}`
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
              `**Staff Roles**\nPing: ${b.pingRoleIds.length ? b.pingRoleIds.map((r) => `<@&${r}>`).join(', ') : '*(none)*'}\nView-only: ${b.viewOnlyRoleIds.length ? b.viewOnlyRoleIds.map((r) => `<@&${r}>`).join(', ') : '*(none)*'}`
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
              `**Rules**\nTH min: ${b.thMin ?? '*-*'} | War stars: ${b.minWarStars ?? '*-*'} | Max accounts: ${b.maxAccounts ?? '*unlimited*'}\nRequire linked: ${b.requireLinkedAccount ? 'Yes' : 'No'} | Staff thread: ${b.createStaffThread ? 'Yes' : 'No'}`
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
        await this.client.db.collection<TicketPanelEntity>(Collections.TICKET_PANELS).updateOne(
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
          await this.client.db
            .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
            .updateOne({ _id: currentPanel._id }, { $pull: { ticketTypes: { id: buttonId } } });
          currentPanel =
            (await this.getPanel(currentPanel.guildId, currentPanel.name)) ?? currentPanel;
          collector.stop('deleted');
          return;
        }

        try {
          if (action.customId === ids.editLabel) {
            const modalId = this.client.uuid(action.user.id);
            const labelFieldId = nanoid(8);
            const emojiFieldId = nanoid(8);
            const modal = new ModalBuilder().setCustomId(modalId).setTitle('Edit Application Type');
            const labelInput = new TextInputBuilder()
              .setCustomId(labelFieldId)
              .setStyle(TextInputStyle.Short)
              .setMaxLength(80)
              .setRequired(true);
            if (btn!.label) labelInput.setValue(btn!.label);
            const emojiInput = new TextInputBuilder()
              .setCustomId(emojiFieldId)
              .setStyle(TextInputStyle.Short)
              .setMaxLength(32)
              .setRequired(false);
            if (btn!.emoji) emojiInput.setValue(btn!.emoji);
            modal.addLabelComponents(
              new LabelBuilder().setLabel('Label').setTextInputComponent(labelInput),
              new LabelBuilder().setLabel('Emoji (optional)').setTextInputComponent(emojiInput)
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === modalId
            });
            await updateTicketType({
              label: submit.fields.getTextInputValue(labelFieldId),
              emoji: submit.fields.getTextInputValue(emojiFieldId) || undefined
            });
            await submit.deferUpdate();
            this.client.components.delete(modalId);
          } else if (action.customId === ids.editRoles) {
            currentPanel = await this.editTicketTypeRolesModal(
              action as unknown as ButtonInteraction<'cached'>,
              currentPanel,
              buttonId,
              btn!
            );
            btn = currentPanel.ticketTypes.find((b) => b.id === buttonId)!;
          } else if (action.customId === ids.editRules) {
            const modalId = this.client.uuid(action.user.id);
            const thId = nanoid(8);
            const maxId = nanoid(8);
            const starsId = nanoid(8);
            const flagsId = nanoid(8);
            const modal = new ModalBuilder().setCustomId(modalId).setTitle('Apply Rules');
            modal.addLabelComponents(
              new LabelBuilder()
                .setLabel('Minimum TH level (empty = no requirement)')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(thId)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(2)
                    .setRequired(false)
                    .setValue(btn!.thMin != null ? String(btn!.thMin) : '')
                ),
              new LabelBuilder().setLabel('Max accounts (blank = unlimited)').setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId(maxId)
                  .setStyle(TextInputStyle.Short)
                  .setMaxLength(2)
                  .setRequired(false)
                  .setValue(btn!.maxAccounts != null ? String(btn!.maxAccounts) : '')
              ),
              new LabelBuilder()
                .setLabel('Min war stars (empty = no requirement)')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(starsId)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(6)
                    .setRequired(false)
                    .setValue(btn!.minWarStars != null ? String(btn!.minWarStars) : '')
                ),
              new LabelBuilder()
                .setLabel('Options')
                .setCheckboxGroupComponent(
                  new CheckboxGroupBuilder()
                    .setCustomId(flagsId)
                    .addOptions(
                      new CheckboxGroupOptionBuilder()
                        .setLabel('Require linked CoC account')
                        .setValue('require_linked')
                        .setDefault(btn!.requireLinkedAccount),
                      new CheckboxGroupOptionBuilder()
                        .setLabel('Create staff thread')
                        .setValue('staff_thread')
                        .setDefault(btn!.createStaffThread)
                    )
                )
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === modalId
            });
            const thRaw = submit.fields.getTextInputValue(thId);
            const maxRaw = submit.fields.getTextInputValue(maxId);
            const starsRaw = submit.fields.getTextInputValue(starsId);
            const flags = submit.fields.getCheckboxGroup(flagsId);
            const requireLinkedAccount = flags.includes('require_linked');
            const createStaffThread = flags.includes('staff_thread');
            await updateTicketType({
              thMin: thRaw ? parseInt(thRaw) || undefined : undefined,
              maxAccounts: maxRaw ? parseInt(maxRaw) || undefined : undefined,
              minWarStars: starsRaw ? parseInt(starsRaw) || undefined : undefined,
              requireLinkedAccount,
              createStaffThread
            });
            await submit.deferUpdate();
            this.client.components.delete(modalId);
          } else if (action.customId === ids.editQuestions) {
            const modalId = this.client.uuid(action.user.id);
            const q1 = nanoid(8);
            const q2 = nanoid(8);
            const q3 = nanoid(8);
            const q4 = nanoid(8);
            const q5 = nanoid(8);
            const existing = btn!.questions ?? [];
            const modal = new ModalBuilder().setCustomId(modalId).setTitle('Questions (up to 5)');
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
              makeQ(q1, 1),
              makeQ(q2, 2),
              makeQ(q3, 3),
              makeQ(q4, 4),
              makeQ(q5, 5)
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === modalId
            });
            const questions = [
              submit.fields.getTextInputValue(q1),
              submit.fields.getTextInputValue(q2),
              submit.fields.getTextInputValue(q3),
              submit.fields.getTextInputValue(q4),
              submit.fields.getTextInputValue(q5)
            ]
              .filter(Boolean)
              .map((label) => ({ label, required: true }));
            await updateTicketType({ questions });
            await submit.deferUpdate();
            this.client.components.delete(modalId);
          } else if (action.customId === ids.editCategories) {
            currentPanel = await this.editTicketTypeCategoriesModal(
              action as unknown as ButtonInteraction<'cached'>,
              currentPanel,
              buttonId
            );
            btn = currentPanel.ticketTypes.find((b) => b.id === buttonId)!;
          } else if (action.customId === ids.editNaming) {
            const modalId = this.client.uuid(action.user.id);
            const namingId = nanoid(8);
            const modal = new ModalBuilder().setCustomId(modalId).setTitle('Channel Naming');
            modal.addLabelComponents(
              new LabelBuilder().setLabel('Naming convention').setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId(namingId)
                  .setStyle(TextInputStyle.Short)
                  .setMaxLength(64)
                  .setRequired(true)
                  .setPlaceholder('ticket-{count}')
                  .setValue(btn!.namingConvention || DEFAULT_NAMING)
              )
            );
            await action.showModal(modal);
            const submit = await action.awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (a) => a.customId === modalId
            });
            await updateTicketType({
              namingConvention: submit.fields.getTextInputValue(namingId) || DEFAULT_NAMING
            });
            await submit.deferUpdate();
            this.client.components.delete(modalId);
          }
        } catch (e) {
          if (
            !(
              e instanceof DiscordjsError &&
              e.code === DiscordjsErrorCodes.InteractionCollectorError
            )
          )
            throw e;
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
    const modalId = this.client.uuid(action.user.id);
    const pingId = nanoid(8);
    const viewId = nanoid(8);
    const addId = nanoid(8);
    const removeId = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Edit Staff Roles');
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Ping roles (get notified + access)').setRoleSelectMenuComponent(
        new RoleSelectMenuBuilder()
          .setCustomId(pingId)
          .setRequired(false)
          .setMaxValues(10)
          .setDefaultRoles(btn.pingRoleIds ?? [])
      ),
      new LabelBuilder()
        .setLabel('View-only roles (can see but not ping)')
        .setRoleSelectMenuComponent(
          new RoleSelectMenuBuilder()
            .setCustomId(viewId)
            .setRequired(false)
            .setMaxValues(10)
            .setDefaultRoles(btn.viewOnlyRoleIds ?? [])
        ),
      new LabelBuilder().setLabel('Roles to ADD to ticket creator').setRoleSelectMenuComponent(
        new RoleSelectMenuBuilder()
          .setCustomId(addId)
          .setRequired(false)
          .setMaxValues(10)
          .setDefaultRoles(btn.addRoleIds ?? [])
      ),
      new LabelBuilder().setLabel('Roles to REMOVE from ticket creator').setRoleSelectMenuComponent(
        new RoleSelectMenuBuilder()
          .setCustomId(removeId)
          .setRequired(false)
          .setMaxValues(10)
          .setDefaultRoles(btn.removeRoleIds ?? [])
      )
    );

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === modalId
    });

    const pingRoleIds = submit.fields.getSelectedRoles(pingId)?.map((r) => r.id) ?? [];
    const viewOnlyRoleIds = submit.fields.getSelectedRoles(viewId)?.map((r) => r.id) ?? [];
    const addRoleIds = submit.fields.getSelectedRoles(addId)?.map((r) => r.id) ?? [];
    const removeRoleIds = submit.fields.getSelectedRoles(removeId)?.map((r) => r.id) ?? [];

    await this.client.db.collection<TicketPanelEntity>(Collections.TICKET_PANELS).updateOne(
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
    this.client.components.delete(modalId);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editSavedRepliesFlow(
    interaction: CommandInteraction<'cached'>,
    guildId: string
  ): Promise<void> {
    const getSettings = () =>
      this.client.db
        .collection<TicketGuildSettingsEntity>(Collections.TICKET_SETTINGS)
        .findOne({ guildId });

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
      await this.client.db
        .collection<TicketGuildSettingsEntity>(Collections.TICKET_SETTINGS)
        .updateOne(
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
              : `-# Click **Edit / Delete** next to a reply to edit or remove it. Up to **25 replies** per server.`
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
            const modalId = this.client.uuid(action.user.id);
            const nameId = nanoid(8);
            const contentId = nanoid(8);
            const modal = new ModalBuilder().setCustomId(modalId).setTitle('Add Saved Reply');
            modal.addLabelComponents(
              new LabelBuilder()
                .setLabel('Reply name')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(nameId)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(64)
                    .setRequired(true)
                    .setPlaceholder('e.g. Approved, Denied, Welcome')
                ),
              new LabelBuilder()
                .setLabel('Reply content (supports variables)')
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId(contentId)
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
              filter: (a) => a.customId === modalId
            });
            const name = submit.fields.getTextInputValue(nameId).trim();
            const content = submit.fields.getTextInputValue(contentId).trim();
            if (name && content) {
              await saveTemplates([...templates, { name, content }]);
              getOrCreateReplyIds(name);
            }
            await submit.deferUpdate();
            this.client.components.delete(modalId);
          } else {
            for (const [replyName, replyIds] of perReplyIds.entries()) {
              if (action.customId === replyIds.edit) {
                const template = templates.find((t) => t.name === replyName);
                if (!template) break;

                const modalId = this.client.uuid(action.user.id);
                const nameId = nanoid(8);
                const contentId = nanoid(8);
                const deleteId = nanoid(8);
                const modal = new ModalBuilder().setCustomId(modalId).setTitle('Edit Saved Reply');
                modal.addLabelComponents(
                  new LabelBuilder()
                    .setLabel('Reply name')
                    .setTextInputComponent(
                      new TextInputBuilder()
                        .setCustomId(nameId)
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(64)
                        .setRequired(true)
                        .setValue(template.name)
                    ),
                  new LabelBuilder()
                    .setLabel('Reply content (supports variables)')
                    .setTextInputComponent(
                      new TextInputBuilder()
                        .setCustomId(contentId)
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(1800)
                        .setRequired(true)
                        .setValue(template.content)
                    ),
                  new LabelBuilder()
                    .setLabel('Delete this reply?')
                    .setCheckboxGroupComponent(
                      new CheckboxGroupBuilder()
                        .setCustomId(deleteId)
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
                  filter: (a) => a.customId === modalId
                });
                const shouldDelete = submit.fields.getCheckboxGroup(deleteId).includes('delete');
                if (shouldDelete) {
                  await saveTemplates(templates.filter((t) => t.name !== replyName));
                  perReplyIds.delete(replyName);
                } else {
                  const newName = submit.fields.getTextInputValue(nameId).trim();
                  const newContent = submit.fields.getTextInputValue(contentId).trim();
                  if (newName && newContent) {
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
                this.client.components.delete(modalId);
                break;
              }
            }
          }
        } catch (e) {
          if (
            !(
              e instanceof DiscordjsError &&
              e.code === DiscordjsErrorCodes.InteractionCollectorError
            )
          )
            throw e;
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

    const modalId = this.client.uuid(action.user.id);
    const openId = nanoid(8);
    const sleepId = nanoid(8);
    const closedId = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Edit Categories');
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Open tickets category').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(openId)
          .setChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(btn.openCategoryId ? [btn.openCategoryId] : [])
      ),
      new LabelBuilder().setLabel('Sleeping tickets category').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(sleepId)
          .setChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(btn.sleepCategoryId ? [btn.sleepCategoryId] : [])
      ),
      new LabelBuilder().setLabel('Closed tickets category').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(closedId)
          .setChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(btn.closedCategoryId ? [btn.closedCategoryId] : [])
      )
    );

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === modalId
    });

    const openId2 = submit.fields.getSelectedChannels(openId)?.first()?.id ?? null;
    const sleepId2 = submit.fields.getSelectedChannels(sleepId)?.first()?.id ?? null;
    const closedId2 = submit.fields.getSelectedChannels(closedId)?.first()?.id ?? null;

    await this.client.db.collection<TicketPanelEntity>(Collections.TICKET_PANELS).updateOne(
      { '_id': panel._id, 'ticketTypes.id': buttonId },
      {
        $set: {
          'ticketTypes.$.openCategoryId': openId2,
          'ticketTypes.$.sleepCategoryId': sleepId2,
          'ticketTypes.$.closedCategoryId': closedId2,
          'updatedAt': new Date()
        }
      }
    );

    await submit.deferUpdate();
    this.client.components.delete(modalId);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  private async editRulesModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ) {
    if (panel.ticketTypes.length === 0) return;
    const btn = panel.ticketTypes[0];
    const modalId = this.client.uuid(action.user.id);
    const thId = nanoid(8);
    const maxId = nanoid(8);
    const starsId = nanoid(8);
    const flagsId = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Apply Rules');
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Min TH level (empty = no requirement)').setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(thId)
          .setStyle(TextInputStyle.Short)
          .setMaxLength(2)
          .setRequired(false)
          .setValue(btn.thMin != null ? String(btn.thMin) : '')
      ),
      new LabelBuilder().setLabel('Max accounts per application').setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(maxId)
          .setStyle(TextInputStyle.Short)
          .setMaxLength(2)
          .setRequired(false)
          .setValue(btn.maxAccounts != null ? String(btn.maxAccounts) : '')
      ),
      new LabelBuilder().setLabel('Min war stars (empty = no requirement)').setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(starsId)
          .setStyle(TextInputStyle.Short)
          .setMaxLength(6)
          .setRequired(false)
          .setValue(btn.minWarStars != null ? String(btn.minWarStars) : '')
      ),
      new LabelBuilder()
        .setLabel('Options')
        .setCheckboxGroupComponent(
          new CheckboxGroupBuilder()
            .setCustomId(flagsId)
            .addOptions(
              new CheckboxGroupOptionBuilder()
                .setLabel('Require linked CoC account')
                .setValue('require_linked')
                .setDefault(btn.requireLinkedAccount),
              new CheckboxGroupOptionBuilder()
                .setLabel('Create staff thread')
                .setValue('staff_thread')
                .setDefault(btn.createStaffThread)
            )
        )
    );

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === modalId
    });

    const thRaw = submit.fields.getTextInputValue(thId);
    const maxRaw = submit.fields.getTextInputValue(maxId);
    const starsRaw = submit.fields.getTextInputValue(starsId);
    const flags = submit.fields.getCheckboxGroup(flagsId);
    const requireLinkedAccount = flags.includes('require_linked');
    const createStaffThread = flags.includes('staff_thread');

    await this.client.db.collection<TicketPanelEntity>(Collections.TICKET_PANELS).updateOne(
      { '_id': panel._id, 'ticketTypes.id': btn.id },
      {
        $set: {
          'ticketTypes.$.thMin': thRaw ? parseInt(thRaw) || undefined : undefined,
          'ticketTypes.$.maxAccounts': maxRaw ? parseInt(maxRaw) || undefined : undefined,
          'ticketTypes.$.minWarStars': starsRaw ? parseInt(starsRaw) || undefined : undefined,
          'ticketTypes.$.requireLinkedAccount': requireLinkedAccount,
          'ticketTypes.$.createStaffThread': createStaffThread,
          'updatedAt': new Date()
        }
      }
    );

    await submit.deferUpdate();
    this.client.components.delete(modalId);
  }

  private async editQuestionsModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ) {
    if (panel.ticketTypes.length === 0) return;
    const btn = panel.ticketTypes[0];
    const existing = btn.questions ?? [];
    const modalId = this.client.uuid(action.user.id);
    const q1 = nanoid(8);
    const q2 = nanoid(8);
    const q3 = nanoid(8);
    const q4 = nanoid(8);
    const q5 = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Questions (up to 5)');
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
    modal.addLabelComponents(makeQ(q1, 1), makeQ(q2, 2), makeQ(q3, 3), makeQ(q4, 4), makeQ(q5, 5));

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === modalId
    });

    const questions = [
      submit.fields.getTextInputValue(q1),
      submit.fields.getTextInputValue(q2),
      submit.fields.getTextInputValue(q3),
      submit.fields.getTextInputValue(q4),
      submit.fields.getTextInputValue(q5)
    ]
      .filter(Boolean)
      .map((label) => ({ label, required: true }));

    await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .updateOne(
        { '_id': panel._id, 'ticketTypes.id': btn.id },
        { $set: { 'ticketTypes.$.questions': questions, 'updatedAt': new Date() } }
      );

    await submit.deferUpdate();
    this.client.components.delete(modalId);
  }

  private async editNamingModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ) {
    if (panel.ticketTypes.length === 0) return;
    const btn = panel.ticketTypes[0];
    const modalId = this.client.uuid(action.user.id);
    const namingId = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Channel Naming');
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Convention').setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(namingId)
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
      filter: (a) => a.customId === modalId
    });

    await this.client.db.collection<TicketPanelEntity>(Collections.TICKET_PANELS).updateOne(
      { '_id': panel._id, 'ticketTypes.id': btn.id },
      {
        $set: {
          'ticketTypes.$.namingConvention':
            submit.fields.getTextInputValue(namingId) || DEFAULT_NAMING,
          'updatedAt': new Date()
        }
      }
    );

    await submit.deferUpdate();
    this.client.components.delete(modalId);
  }

  private async editLoggingModal(
    action: ButtonInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>
  ): Promise<WithId<TicketPanelEntity>> {
    const modalId = this.client.uuid(action.user.id);
    const buttonClickId = nanoid(8);
    const statusChangeId = nanoid(8);
    const ticketCloseId = nanoid(8);

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Edit Logging Channels');
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Button click log channel').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(buttonClickId)
          .setChannelTypes(ChannelType.GuildText)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(panel.logChannels.buttonClick ? [panel.logChannels.buttonClick] : [])
      ),
      new LabelBuilder().setLabel('Status change log channel').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(statusChangeId)
          .setChannelTypes(ChannelType.GuildText)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(
            panel.logChannels.statusChange ? [panel.logChannels.statusChange] : []
          )
      ),
      new LabelBuilder().setLabel('Ticket close log channel').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId(ticketCloseId)
          .setChannelTypes(ChannelType.GuildText)
          .setRequired(false)
          .setMaxValues(1)
          .setDefaultChannels(panel.logChannels.ticketClose ? [panel.logChannels.ticketClose] : [])
      )
    );

    await action.showModal(modal);
    const submit = await action.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (a) => a.customId === modalId
    });

    const buttonClickChannel =
      submit.fields.getSelectedChannels(buttonClickId)?.first()?.id ?? null;
    const statusChangeChannel =
      submit.fields.getSelectedChannels(statusChangeId)?.first()?.id ?? null;
    const ticketCloseChannel =
      submit.fields.getSelectedChannels(ticketCloseId)?.first()?.id ?? null;

    await this.client.db.collection<TicketPanelEntity>(Collections.TICKET_PANELS).updateOne(
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
    this.client.components.delete(modalId);

    return (await this.getPanel(panel.guildId, panel.name)) ?? panel;
  }

  // =================== UTILITY ===================

  public async getPanel(guildId: string, name: string) {
    return this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ guildId, name });
  }
}
