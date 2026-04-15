import { Collections } from '@app/constants';
import { TicketTypeConfig, TicketEntity, TicketPanelEntity } from '@app/entities';
import { APIPlayer } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  ChannelType,
  ComponentType,
  ContainerBuilder,
  GuildMember,
  LabelBuilder,
  MessageComponentInteraction,
  MessageFlags,
  ModalBuilder,
  OverwriteResolvable,
  PermissionFlagsBits,
  SectionBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextChannel,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { ObjectId, WithId } from 'mongodb';
import { nanoid } from 'nanoid';
import { Args, Command } from '../../lib/handlers.js';

const DEFAULT_NAMING = 'ticket-{count}';

function resolveChannelName(
  convention: string,
  data: { count: number; user: string; accountName?: string; accountTh?: number }
) {
  return convention
    .replace('{count}', String(data.count).padStart(4, '0'))
    .replace(
      '{user}',
      (data.user || '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase()
        .slice(0, 16)
    )
    .replace(
      '{account_name}',
      (data.accountName || '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase()
        .slice(0, 16)
    )
    .replace('{account_th}', String(data.accountTh || ''))
    .replace('{status}', 'open')
    .replace('{emoji_status}', '')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 100);
}

function resolveTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}

function findUnknownVars(template: string, vars: Record<string, string>) {
  const matches = template.match(/\{(\w+)\}/g) ?? [];
  return matches
    .map((m) => m.slice(1, -1))
    .filter((k) => !(k in vars))
    .filter((v, i, a) => a.indexOf(v) === i);
}

export default class TicketOpenCommand extends Command {
  public constructor() {
    super('ticket-open', {
      category: 'tickets',
      channel: 'guild',
      clientPermissions: [
        'ManageChannels',
        'ManageRoles',
        'ViewChannel',
        'SendMessages',
        'AttachFiles',
        'EmbedLinks',
        'CreatePrivateThreads',
        'SendMessagesInThreads'
      ],
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {};
  }

  public async exec(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const action = args.action as string | undefined;

    switch (action) {
      case 'open':
        return this.openTicketFlow(interaction, args);
      case 'select-type':
        return this.handleTypeSelect(interaction, args);
      case 'accounts':
        return this.handleAccountSelect(interaction, args);
      case 'del-confirm':
        return this.confirmDeleteTicket(interaction, args);
      case 'del-ticket':
        return this.deleteTicketChannel(interaction, args);
      case 'respond':
        return this.sendResponse(interaction, args);
      case 'set-clan':
        return this.setClan(interaction, args);
      case 'set-clan-select':
        return this.setClanSelect(interaction, args);
      case 'view-acc':
        return this.viewAccount(interaction, args);
      case 'notify':
        return this.toggleNotify(interaction, args);
    }
  }

  // =================== TICKET CREATION ===================

  private async openTicketFlow(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const panelId = args.pid as string;

    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(panelId) });

    if (!panel) {
      return interaction.editReply({ content: 'This panel no longer exists.' });
    }

    if (panel.ticketTypes.length === 0) {
      return interaction.editReply({
        content: 'No application types are configured for this panel.'
      });
    }

    // Single type — proceed directly
    if (panel.ticketTypes.length === 1) {
      return this.proceedWithType(interaction, panel, panel.ticketTypes[0]);
    }

    // Multiple types — show select menu
    const selectId = this.createId({
      cmd: 'ticket-open',
      action: 'select-type',
      pid: panelId,
      ephemeral: true
    });

    return interaction.editReply({
      content: 'Select the type of ticket you want to open:',
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(selectId)
            .setPlaceholder('Choose an application type…')
            .setOptions(
              panel.ticketTypes.slice(0, 25).map((b) => ({
                label: b.label,
                value: b.id,
                ...(b.emoji ? { emoji: b.emoji } : {})
              }))
            )
        )
      ]
    });
  }

  private async handleTypeSelect(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const panelId = args.pid as string;
    const typeId = (args.selected as string[] | undefined)?.[0] ?? (args.string_key as string);

    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(panelId) });

    if (!panel) return interaction.editReply({ content: 'Panel not found.' });

    const btn = panel.ticketTypes.find((b) => b.id === typeId);
    if (!btn) return interaction.editReply({ content: 'Application type not found.' });

    return this.proceedWithType(interaction, panel, btn);
  }

  private async proceedWithType(
    interaction: MessageComponentInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>,
    btn: TicketTypeConfig
  ) {
    const panelId = panel._id.toHexString();
    const buttonId = btn.id;

    // Check if user already has an open ticket for this type
    const existing = await this.client.db.collection<TicketEntity>(Collections.TICKETS).findOne({
      guildId: interaction.guildId,
      panelId,
      buttonId,
      creatorId: interaction.user.id,
      status: { $in: ['open', 'sleep'] }
    });

    if (existing) {
      return interaction.editReply({
        content: `You already have an open ticket: <#${existing.channelId}>`
      });
    }

    // Log button click
    void this.logButtonClick(panel, btn, interaction);

    // If CoC account required, show account select
    if (btn.requireLinkedAccount) {
      return this.showAccountSelect(interaction, panel, btn);
    }

    // If questions configured, show modal
    if (btn.questions?.length) {
      return this.showQuestionsModal(interaction, panel, btn, null);
    }

    // Otherwise create ticket directly
    return this.createTicketChannel(interaction, panel, btn, null, []);
  }

  private async showAccountSelect(
    interaction: MessageComponentInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>,
    btn: TicketTypeConfig
  ) {
    const linkedTags = await this.client.resolver.getLinkedPlayerTags(interaction.user.id);

    if (linkedTags.length === 0) {
      return interaction.editReply({
        content: `You need a linked Clash of Clans account to open this ticket. Use </link add:0> to link your account.`
      });
    }

    // Fetch player data for all linked accounts
    const playerResults = await Promise.all(
      linkedTags.map((tag) => this.client.coc.getPlayer(tag).catch(() => null))
    );
    const validPlayers = playerResults.filter(Boolean).map((r) => r!.body as APIPlayer);

    // Filter by requirements
    const qualifying = validPlayers.filter((p) => {
      if (btn.thMin && (p.townHallLevel ?? 0) < btn.thMin) return false;
      return true;
    });

    if (qualifying.length === 0) {
      const parts = [`None of your linked accounts meet the requirements:`];
      if (btn.thMin) parts.push(`- TH${btn.thMin}+ required`);
      return interaction.editReply({ content: parts.join('\n') });
    }

    const selectId = this.createId({
      cmd: 'ticket-open',
      action: 'accounts',
      pid: panel._id.toHexString(),
      bid: btn.id,
      ephemeral: true
    });

    const accountOptions = qualifying.slice(0, 25).map((p) => ({
      label: `${p.name} (TH${p.townHallLevel})`,
      value: p.tag,
      description: p.tag
    }));

    return interaction.editReply({
      content: 'Select the account you want to apply with:',
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(selectId)
            .setPlaceholder('Select an account…')
            .setOptions(accountOptions)
        )
      ]
    });
  }

  private async handleAccountSelect(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const panelId = args.pid as string;
    const buttonId = args.bid as string;
    const accountTag = (args.selected as string[] | undefined)?.[0] ?? (args.string_key as string);

    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(panelId) });

    if (!panel) return interaction.editReply({ content: 'Panel not found.' });

    const btn = panel.ticketTypes.find((b) => b.id === buttonId);
    if (!btn) return interaction.editReply({ content: 'Button not found.' });

    const playerResult = accountTag
      ? await this.client.coc.getPlayer(accountTag).catch(() => null)
      : null;
    const player = playerResult ? (playerResult.body as APIPlayer) : null;

    if (btn.questions?.length) {
      return this.showQuestionsModal(interaction, panel, btn, player);
    }

    return this.createTicketChannel(interaction, panel, btn, player, []);
  }

  private async showQuestionsModal(
    interaction: MessageComponentInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>,
    btn: TicketTypeConfig,
    player: APIPlayer | null
  ) {
    if (!btn.questions?.length) return;

    const modalId = nanoid(12);
    const questionIds = btn.questions.map(() => nanoid(8));

    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Application Questions');
    modal.addLabelComponents(
      ...btn.questions.slice(0, 5).map((q, i) =>
        new LabelBuilder().setLabel(q.label.slice(0, 45)).setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(questionIds[i])
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(q.required)
            .setMaxLength(1000)
            .setPlaceholder(q.placeholder ?? '')
        )
      )
    );

    await interaction.showModal(modal);

    const submit = await interaction
      .awaitModalSubmit({
        time: 10 * 60 * 1000,
        filter: (a) => a.customId === modalId
      })
      .catch(() => null);

    if (!submit) return;

    const answers = btn.questions.slice(0, 5).map((q, i) => ({
      question: q.label,
      answer: submit.fields.getTextInputValue(questionIds[i])
    }));

    await submit.deferReply({ flags: MessageFlags.Ephemeral });
    return this.createTicketChannel(
      submit as unknown as MessageComponentInteraction<'cached'>,
      panel,
      btn,
      player,
      answers
    );
  }

  private async createTicketChannel(
    interaction: MessageComponentInteraction<'cached'>,
    panel: WithId<TicketPanelEntity>,
    btn: TicketTypeConfig,
    player: APIPlayer | null,
    answers: { question: string; answer: string }[]
  ) {
    const guild = interaction.guild!;

    // Get next ticket count
    const latestTicket = await this.client.db
      .collection<TicketEntity>(Collections.TICKETS)
      .findOne({ guildId: guild.id }, { sort: { count: -1 } });

    const count = (latestTicket?.count ?? 0) + 1;

    // Resolve channel name
    const channelName = resolveChannelName(btn.namingConvention || DEFAULT_NAMING, {
      count,
      user: interaction.user.username,
      accountName: player?.name,
      accountTh: player?.townHallLevel
    });

    // Get category
    const categoryId = btn.openCategoryId;
    const category = categoryId
      ? (guild.channels.cache.get(categoryId) as CategoryChannel | undefined)
      : undefined;

    // Build permissions
    const permissionOverwrites: OverwriteResolvable[] = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];

    // Ping roles — full access
    for (const roleId of btn.pingRoleIds) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels
        ]
      });
    }

    // View-only roles — can see and send but not manage
    for (const roleId of btn.viewOnlyRoleIds) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites
    });

    // Save ticket to DB
    const ticketDoc: TicketEntity = {
      _id: new ObjectId(),
      count,
      guildId: guild.id,
      channelId: ticketChannel.id,
      panelId: panel._id.toHexString(),
      buttonId: btn.id,
      creatorId: interaction.user.id,
      accountTag: player?.tag,
      accountName: player?.name,
      accountTh: player?.townHallLevel,
      answers: answers.length ? answers : undefined,
      status: 'open',
      notifyMeUserIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.client.db.collection<TicketEntity>(Collections.TICKETS).insertOne(ticketDoc);

    // Post ticket embed in channel
    await this.postTicketEmbed(
      ticketChannel,
      ticketDoc,
      panel,
      btn,
      interaction.member as GuildMember
    );

    // Optional: add/remove roles from creator
    const member = interaction.member as GuildMember | null;
    if (member) {
      for (const roleId of btn.addRoleIds) {
        await member.roles.add(roleId).catch(() => null);
      }
      for (const roleId of btn.removeRoleIds) {
        await member.roles.remove(roleId).catch(() => null);
      }
    }

    // Optional: create private staff thread
    if (btn.createStaffThread && btn.pingRoleIds.length > 0) {
      const thread = await ticketChannel.threads
        .create({
          name: `staff-${channelName}`,
          type: ChannelType.PrivateThread
        })
        .catch(() => null);

      if (thread) {
        await this.client.db
          .collection<TicketEntity>(Collections.TICKETS)
          .updateOne({ _id: ticketDoc._id }, { $set: { threadId: thread.id } });
        await thread
          .send({ content: `Staff thread for ticket #${count} — <@${interaction.user.id}>` })
          .catch(() => null);
      }
    }

    // Log status change
    void this.logStatusChange(panel, ticketDoc, 'created', null, 'open', interaction.user.id);

    await interaction
      .editReply({ content: `Ticket opened: <#${ticketChannel.id}>`, components: [] })
      .catch(() => null);
  }

  private async postTicketEmbed(
    channel: TextChannel,
    ticket: TicketEntity,
    panel: WithId<TicketPanelEntity>,
    btn: TicketTypeConfig,
    member: GuildMember
  ) {
    const ticketNum = String(ticket.count).padStart(4, '0');
    const headerText = [
      `## Ticket #${ticketNum}`,
      `**Created by:** <@${ticket.creatorId}>`,
      `**Created at:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`,
      ticket.accountName && ticket.accountTh
        ? `**Account:** **${ticket.accountName}** (TH${ticket.accountTh}) — \`${ticket.accountTag}\``
        : null
    ]
      .filter(Boolean)
      .join('\n');

    const container = new ContainerBuilder();
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
        .setButtonAccessory(
          new ButtonBuilder()
            .setURL(member.user.displayAvatarURL({ size: 64 }))
            .setLabel('\u200b')
            .setStyle(ButtonStyle.Link)
        )
    );

    if (ticket.answers?.length) {
      container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));
      const answersText = ticket.answers
        .map(({ question, answer }) => `**${question}**\n${answer || '*(no answer)*'}`)
        .join('\n\n');
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(answersText));
    }

    // Build in-ticket action buttons
    const deleteId = this.createId({ cmd: 'ticket-open', action: 'del-confirm', cid: channel.id });
    const respondId = this.createId({ cmd: 'ticket-open', action: 'respond', cid: channel.id });
    const setClanId = this.createId({ cmd: 'ticket-open', action: 'set-clan', cid: channel.id });
    const viewAccId = ticket.accountTag
      ? this.createId({ cmd: 'ticket-open', action: 'view-acc', cid: channel.id })
      : null;
    const notifyId = this.createId({
      cmd: 'ticket-open',
      action: 'notify',
      cid: channel.id,
      ephemeral: true
    });

    container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents((row) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(deleteId)
          .setLabel('Delete Ticket')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(respondId)
          .setLabel('Send Response')
          .setEmoji('💬')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(setClanId)
          .setLabel('Set Clan')
          .setEmoji('🏰')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(notifyId)
          .setLabel('Notify Me')
          .setEmoji('🔔')
          .setStyle(ButtonStyle.Secondary)
      );
      if (viewAccId) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(viewAccId)
            .setLabel('View Account')
            .setEmoji('⚔️')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      return row;
    });

    // Ping staff roles + mention user — must be inside the CV2 container, not as `content`
    const pings = btn.pingRoleIds.map((id) => `<@&${id}>`).join(' ');
    const mentionLine = [pings, `<@${ticket.creatorId}>`].filter(Boolean).join(' ');
    if (mentionLine) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(mentionLine));
    }

    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

  // =================== IN-TICKET BUTTON HANDLERS ===================

  private async confirmDeleteTicket(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const channelId = args.cid as string;
    const ticket = await this.getTicketByChannel(channelId);
    if (!ticket) return interaction.editReply({ content: 'Ticket not found.' });

    const confirmId = this.createId({
      cmd: 'ticket-open',
      action: 'del-ticket',
      cid: channelId,
      ephemeral: true
    });
    const cancelId = this.client.uuid(interaction.user.id);

    const confirmContainer = new ContainerBuilder();
    confirmContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Delete Ticket?\nAre you sure you want to delete ticket **#${String(ticket.count).padStart(4, '0')}**?\n\nThis will generate a transcript, log it, and delete the channel.`
      )
    );
    confirmContainer.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(confirmId)
          .setLabel('Delete')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      )
    );

    await interaction.editReply({
      components: [confirmContainer],
      flags: MessageFlags.IsComponentsV2
    });

    // Collect cancel press
    const msg = await interaction.fetchReply();
    const cancel = await msg
      .awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (a) => a.customId === cancelId && a.user.id === interaction.user.id,
        time: 60_000
      })
      .catch(() => null);

    if (cancel) {
      this.client.components.delete(cancelId);
      await cancel.update({
        components: [
          new ContainerBuilder().addTextDisplayComponents((t) =>
            t.setContent('Deletion cancelled.')
          )
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  private async deleteTicketChannel(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const channelId = args.cid as string;
    const ticket = await this.getTicketByChannel(channelId);
    if (!ticket) return interaction.editReply({ content: 'Ticket not found.' });

    const channel = interaction.guild!.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return interaction.editReply({ content: 'Channel not found.' });

    // Get panel for logging
    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(ticket.panelId) });

    await interaction.editReply({
      content: `Closing ticket… generating transcript.`,
      embeds: [],
      components: []
    });

    // Generate transcript
    const transcript = await this.generateTranscript(channel);
    const transcriptBuffer = Buffer.from(transcript, 'utf-8');

    // Update ticket status
    await this.client.db.collection<TicketEntity>(Collections.TICKETS).updateOne(
      { _id: ticket._id },
      {
        $set: {
          status: 'closed',
          closedAt: new Date(),
          closedBy: interaction.user.id,
          updatedAt: new Date()
        }
      }
    );

    // Log ticket close
    if (panel?.logChannels.ticketClose) {
      const logChannel = interaction.guild!.channels.cache.get(panel.logChannels.ticketClose) as
        | TextChannel
        | undefined;

      if (logChannel) {
        const closeContainer = new ContainerBuilder();
        closeContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## Ticket Closed — #${String(ticket.count).padStart(4, '0')}\n**Created by:** <@${ticket.creatorId}>\n**Closed by:** <@${interaction.user.id}>\n**Created at:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`
          )
        );
        await logChannel
          .send({
            components: [closeContainer],
            flags: MessageFlags.IsComponentsV2,
            files: [{ attachment: transcriptBuffer, name: `ticket-${ticket.count}.txt` }]
          })
          .catch(() => null);
      }
    }

    void this.logStatusChange(
      panel ?? null,
      ticket,
      'closed',
      'open',
      'closed',
      interaction.user.id
    );

    // Delete channel after short delay
    setTimeout(() => channel.delete('Ticket closed').catch(() => null), 3000);
  }

  private async sendResponse(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const channelId = args.cid as string;
    const ticket = await this.getTicketByChannel(channelId);
    if (!ticket) return interaction.editReply({ content: 'Ticket not found.' });

    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(ticket.panelId) });

    const btn = panel?.ticketTypes.find((b) => b.id === ticket.buttonId);
    const templates = btn?.messageTemplates ?? [];

    if (templates.length === 0) {
      return interaction.editReply({
        content: 'No message templates configured. Add some via `/ticket setup`.'
      });
    }

    const selectId = this.client.uuid(interaction.user.id);

    await interaction.editReply({
      content: 'Select a response template:',
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(selectId)
            .setPlaceholder('Choose a template…')
            .setOptions(templates.slice(0, 25).map((t) => ({ label: t.name, value: t.name })))
        )
      ]
    });

    const msg = await interaction.fetchReply();
    const selection = await msg
      .awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (a) => a.customId === selectId,
        time: 60_000
      })
      .catch(() => null);

    this.client.components.delete(selectId);

    if (!selection) {
      return interaction.editReply({ content: 'Timed out.', components: [] });
    }

    const templateName = selection.values[0];
    const template = templates.find((t) => t.name === templateName);
    if (!template) return selection.update({ content: 'Template not found.', components: [] });

    // Build variable map
    const creatorMember = await interaction
      .guild!.members.fetch(ticket.creatorId)
      .catch(() => null);

    const vars: Record<string, string> = {
      user_mention: `<@${ticket.creatorId}>`,
      user_name: creatorMember?.user.username ?? ticket.creatorId,
      account_name: ticket.accountName ?? '',
      account_th: ticket.accountTh ? `TH${ticket.accountTh}` : '',
      account_heroes: '',
      clan_name: ticket.clanName ?? '',
      clan_tag: ticket.clanTag ?? '',
      clan_link: ticket.clanTag
        ? `https://link.clashofclans.com/?action=OpenClanProfile&tag=${ticket.clanTag.replace('#', '')}`
        : '',
      clan_leader: '',
      clan_leader_mention: '',
      ticket_count: String(ticket.count).padStart(4, '0'),
      ticket_status: ticket.status,
      server_name: interaction.guild!.name
    };

    // Check for unknown variables
    const unknown = findUnknownVars(template.content, vars);

    if (unknown.length > 0) {
      // Show modal for staff to fill in unknowns
      const modalId = this.client.uuid(selection.user.id);
      const unknownIds = unknown.map(() => nanoid(8));
      const modal = new ModalBuilder().setCustomId(modalId).setTitle('Fill in Template Variables');
      modal.addLabelComponents(
        ...unknown
          .slice(0, 5)
          .map((varName, i) =>
            new LabelBuilder()
              .setLabel(`{${varName}}`)
              .setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId(unknownIds[i])
                  .setStyle(TextInputStyle.Short)
                  .setMaxLength(256)
                  .setRequired(false)
              )
          )
      );

      await selection.showModal(modal);
      const modalSubmit = await selection
        .awaitModalSubmit({ time: 5 * 60 * 1000, filter: (a) => a.customId === modalId })
        .catch(() => null);

      if (modalSubmit) {
        unknown.slice(0, 5).forEach((varName, i) => {
          vars[varName] = modalSubmit.fields.getTextInputValue(unknownIds[i]);
        });
        await modalSubmit.deferUpdate();
        this.client.components.delete(modalId);
      }
    } else {
      await selection.deferUpdate();
    }

    const content = resolveTemplate(template.content, vars);
    const channel = interaction.guild!.channels.cache.get(channelId) as TextChannel | undefined;

    if (channel) {
      await channel.send({ content }).catch(() => null);
    }

    await interaction
      .editReply({ content: `Response sent using template **${templateName}**.`, components: [] })
      .catch(() => null);
  }

  private async setClan(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const channelId = args.cid as string;
    const ticket = await this.getTicketByChannel(channelId);
    if (!ticket) return interaction.editReply({ content: 'Ticket not found.' });

    const clans = await this.client.db
      .collection(Collections.CLAN_STORES)
      .find({ guild: interaction.guildId })
      .toArray();

    if (clans.length === 0) {
      return interaction.editReply({ content: 'No clans are set up in this server.' });
    }

    const setClanSelectId = this.createId({
      cmd: 'ticket-open',
      action: 'set-clan-select',
      cid: channelId,
      ephemeral: true
    });

    await interaction.editReply({
      content: 'Select the clan to associate with this ticket:',
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(setClanSelectId)
            .setPlaceholder('Select a clan…')
            .setOptions(
              clans.slice(0, 25).map((c) => ({
                label: c.name,
                value: c.tag,
                description: c.tag
              }))
            )
        )
      ]
    });
  }

  private async setClanSelect(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const channelId = args.cid as string;
    const clanTag = (args.selected as string[] | undefined)?.[0] ?? (args.string_key as string);

    const clan = await this.client.db
      .collection(Collections.CLAN_STORES)
      .findOne({ tag: clanTag, guild: interaction.guildId });

    await this.client.db
      .collection<TicketEntity>(Collections.TICKETS)
      .updateOne(
        { channelId },
        { $set: { clanTag, clanName: clan?.name ?? clanTag, updatedAt: new Date() } }
      );

    await interaction.editReply({
      content: `Clan set to **${clan?.name ?? clanTag}**`,
      components: []
    });
  }

  private async viewAccount(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const channelId = args.cid as string;
    const ticket = await this.getTicketByChannel(channelId);
    if (!ticket) return interaction.editReply({ content: 'Ticket not found.' });
    if (!ticket.accountTag)
      return interaction.editReply({ content: 'No account linked to this ticket.' });

    const playerResult = await this.client.coc.getPlayer(ticket.accountTag).catch(() => null);
    if (!playerResult) return interaction.editReply({ content: 'Could not fetch player data.' });
    const player = playerResult.body as APIPlayer;

    const accContainer = new ContainerBuilder();
    accContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `## ${player.name} (TH${player.townHallLevel})`,
          `**Tag:** \`${player.tag}\` | **Trophies:** ${player.trophies} | **War Stars:** ${player.warStars ?? 0}`,
          `**Clan:** ${player.clan ? `${player.clan.name} (${player.clan.tag})` : '*(no clan)*'}`
        ].join('\n')
      )
    );
    await interaction.editReply({
      components: [accContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }

  private async toggleNotify(
    interaction: MessageComponentInteraction<'cached'>,
    args: Record<string, unknown>
  ) {
    const channelId = args.cid as string;
    const ticket = await this.getTicketByChannel(channelId);
    if (!ticket) return interaction.editReply({ content: 'Ticket not found.' });

    const userId = interaction.user.id;
    const isSubscribed = ticket.notifyMeUserIds.includes(userId);

    if (isSubscribed) {
      await this.client.db
        .collection<TicketEntity>(Collections.TICKETS)
        .updateOne({ channelId }, { $pull: { notifyMeUserIds: userId } });
      await interaction.editReply({
        content: 'You will no longer be notified when the ticket creator sends a message.'
      });
    } else {
      await this.client.db
        .collection<TicketEntity>(Collections.TICKETS)
        .updateOne({ channelId }, { $addToSet: { notifyMeUserIds: userId } });
      await interaction.editReply({
        content: 'You will be notified when the ticket creator sends a message.'
      });
    }
  }

  // =================== UTILITY ===================

  public async getTicketByChannel(channelId: string) {
    return this.client.db.collection<TicketEntity>(Collections.TICKETS).findOne({ channelId });
  }

  private async generateTranscript(channel: TextChannel): Promise<string> {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) return '(could not fetch messages)';

    const lines = [...messages.values()].reverse().map((m) => {
      const time = m.createdAt.toISOString();
      const author = `${m.author.username}#${m.author.discriminator}`;
      const content = m.content || (m.embeds.length ? '[embed]' : '[attachment/sticker]');
      return `[${time}] ${author}: ${content}`;
    });

    return [
      `Transcript for #${channel.name}`,
      `Generated: ${new Date().toISOString()}`,
      '='.repeat(60),
      ...lines
    ].join('\n');
  }

  private async logButtonClick(
    panel: WithId<TicketPanelEntity>,
    btn: TicketTypeConfig,
    interaction: MessageComponentInteraction<'cached'>
  ) {
    if (!panel.logChannels.buttonClick) return;

    const logChannel = interaction.guild!.channels.cache.get(panel.logChannels.buttonClick) as
      | TextChannel
      | undefined;

    if (!logChannel) return;

    const clickContainer = new ContainerBuilder();
    clickContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Ticket Button Clicked\n**User:** <@${interaction.user.id}> (${interaction.user.username})\n**Button:** ${btn.label} | **Panel:** ${panel.name}\n**When:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
    );
    await logChannel
      .send({ components: [clickContainer], flags: MessageFlags.IsComponentsV2 })
      .catch(() => null);
  }

  private async logStatusChange(
    panel: WithId<TicketPanelEntity> | null,
    ticket: WithId<TicketEntity>,
    action: string,
    oldStatus: string | null,
    newStatus: string,
    byUserId: string
  ) {
    if (!panel?.logChannels.statusChange) return;

    const guild = this.client.guilds.cache.get(ticket.guildId);
    const logChannel = guild?.channels.cache.get(panel.logChannels.statusChange) as
      | TextChannel
      | undefined;

    if (!logChannel) return;

    const statusContainer = new ContainerBuilder();
    statusContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `## Ticket ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          `**Ticket:** #${String(ticket.count).padStart(4, '0')} <#${ticket.channelId}>`,
          `**By:** <@${byUserId}> | **Status:** ${oldStatus ? `${oldStatus} → ${newStatus}` : newStatus}`
        ].join('\n')
      )
    );
    await logChannel
      .send({ components: [statusContainer], flags: MessageFlags.IsComponentsV2 })
      .catch(() => null);
  }
}
