import { Collections, Settings } from '@app/constants';
import { LayoutsEntity } from '@app/entities';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  BaseInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  DiscordjsError,
  DiscordjsErrorCodes,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import pluralize from 'pluralize';
import { shake } from 'radash';
import { Command, CommandOptions } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { Util } from '../../util/toolkit.js';

const LAYOUT_REGEX =
  /^https?:\/\/link\.clashofclans\.com\/[a-z]{1,2}[\/]?\?action=OpenLayout&id=TH\S+$/;

export default class LayoutCommand extends Command {
  public constructor() {
    super('layout-post', {
      category: 'search',
      channel: 'guild',
      defer: true
    });
  }

  public get collection() {
    return this.client.db.collection<LayoutsEntity>(Collections.LAYOUTS);
  }

  public refine(interaction: BaseInteraction) {
    return {
      ...this.options,
      defer: !interaction.isButton()
    } satisfies CommandOptions;
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: LayoutCommandArgs
  ) {
    args.layout_link &&= args.layout_link.trim();

    if (interaction.isButton() && args.display_link) {
      return this.displayLink(interaction, args);
    }

    if (interaction.isButton() && args.display_viewers) {
      return this.viewDownloader(interaction);
    }

    const layoutTemplate = this.client.settings.get<string>(
      interaction.guild,
      Settings.LAYOUT_TEMPLATE
    );
    if (layoutTemplate && !args.notes) args.notes = layoutTemplate;

    if (interaction.isCommand()) {
      return this.handleSubmit(interaction, args);
    }

    const isAdmin =
      this.client.util.isManager(interaction.member) ||
      interaction.message.interactionMetadata?.user.id === interaction.user.id;
    if (!isAdmin) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: 'You are not allowed to edit this layout.'
      });
    }

    const layout = await this.collection.findOne({
      messageIds: interaction.message.id,
      guildId: interaction.guild.id
    });
    if (layout) args.downloads = layout.downloader.length;

    const modalCustomId = this.client.uuid(interaction.user.id);
    const customIds = {
      link: this.client.uuid(interaction.user.id),
      notes: this.client.uuid(interaction.user.id)
    };
    const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Edit Layout');
    const linkInput = new TextInputBuilder()
      .setCustomId(customIds.link)
      .setLabel('Layout Link')
      .setPlaceholder('Enter Layout Link')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(200)
      .setRequired(true);

    const link = this.getUrlFromInteractionComponents(interaction) || layout?.link;
    if (link) linkInput.setValue(link);

    const descriptionInput = new TextInputBuilder()
      .setCustomId(customIds.notes)
      .setLabel('Notes')
      .setPlaceholder(
        'Write anything you want (markdown, hyperlink and custom emojis are supported)'
      )
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1800)
      .setRequired(false);

    if (interaction.message.content && args.has_description) {
      descriptionInput.setValue(interaction.message.content);
    }

    if (!layout?.notes && layoutTemplate) {
      descriptionInput.setValue(layoutTemplate);
    }

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(linkInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
    );

    try {
      await interaction.showModal(modal);

      const modalSubmitInteraction = await interaction.awaitModalSubmit({
        time: 10 * 60 * 1000,
        filter: (action) => action.customId === modalCustomId
      });

      args.layout_link = modalSubmitInteraction.fields.getTextInputValue(customIds.link);
      args.notes = modalSubmitInteraction.fields.getTextInputValue(customIds.notes);

      await modalSubmitInteraction.deferUpdate();

      return await this.handleSubmit(interaction, args);
    } catch (error) {
      if (
        !(
          error instanceof DiscordjsError &&
          error.code === DiscordjsErrorCodes.InteractionCollectorError
        )
      ) {
        throw error;
      }
    }
  }

  public async handleSubmit(
    interaction:
      | CommandInteraction<'cached'>
      | ButtonInteraction<'cached'>
      | ModalSubmitInteraction<'cached'>,
    args: LayoutCommandArgs
  ) {
    if (!args.layout_link || !LAYOUT_REGEX.test(args.layout_link)) {
      return interaction.followUp({
        flags: MessageFlags.Ephemeral,
        content: 'Invalid layout link was provided.'
      });
    }

    const layoutTypes: Record<string, string> = {
      'WB': 'Town Hall',
      'HV': 'Town Hall',
      'BB2': 'Builder Base',
      'CC:0': 'Capital Peak',
      'CC:1': 'Barbarian Champ',
      'CC:2': 'Wizard Valley',
      'CC:3': 'Ballon Lagoon',
      'CC:4': "Builder's Workshop",
      'CC:5': 'Dragon Cliff',
      'CC:6': 'Golem Quarry',
      'CC:7': 'Skeleton Park',
      'CC:8': 'Goblin Mines'
    };

    const layoutId = new URL(args.layout_link).searchParams.get('id')!;
    const [levelString, layoutType, buildingType] = layoutId.split(':');
    const level = levelString.replace('TH', '');
    const buildingLabel = ['HV', 'BB2', 'WB'].includes(layoutType)
      ? layoutTypes[layoutType]
      : layoutTypes[`CC:${buildingType}`];

    const allowLayoutTracking = this.client.settings.get<boolean>(
      interaction.guild,
      Settings.ALLOW_LAYOUT_TRACKING,
      false
    );

    const layout = await this.collection.findOne({ guildId: interaction.guild.id, layoutId });
    const row = this.getComponents({
      ...args,
      allow_layout_tracking: allowLayoutTracking,
      downloads: layout?.downloader?.length || args.downloads || 0
    });

    const msg = await interaction.editReply({
      components: [row],
      content: args.notes || `**${buildingLabel} ${level} Layout**`,
      ...(args.screenshot && { files: [new AttachmentBuilder(args.screenshot)] })
    });

    await this.collection.updateOne(
      { layoutId, guildId: interaction.guild.id },
      {
        $set: shake({
          label: `${buildingLabel} ${level} Layout`,
          notes: args.notes || null,
          link: args.layout_link,
          imageUrl: args.screenshot,
          updatedAt: new Date()
        }),
        $addToSet: {
          messageIds: msg.id
        },
        $setOnInsert: {
          userId: interaction.isButton()
            ? interaction.message.interactionMetadata?.user.id || interaction.user.id
            : interaction.user.id,
          downloads: 0,
          downloader: [],
          votes: {
            up: [],
            down: []
          },
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    const isVotingEnabled = this.client.settings.get(
      interaction.guild,
      Settings.ALLOW_LAYOUT_VOTING,
      false
    );

    if (interaction.appPermissions.has(PermissionFlagsBits.AddReactions) && isVotingEnabled) {
      try {
        await msg.react(EMOJIS.WHITE_CHECK_MARK);
        await Util.delay(250);
        await msg.react(EMOJIS.RED_CHECK_MARK);
      } catch {}
    }
  }

  private async displayLink(interaction: ButtonInteraction<'cached'>, args: LayoutCommandArgs) {
    const updated = await this.collection.findOneAndUpdate(
      { messageIds: interaction.message.id, guildId: interaction.guild.id },
      { $addToSet: { downloader: interaction.user.id } },
      { returnDocument: 'after' }
    );
    if (!updated)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: 'Layout data not found.'
      });

    const customId = this.client.uuid();
    const modal = new ModalBuilder()
      .setTitle('Copy Layout')
      .setCustomId(customId)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            updated.notes || `# ${updated.label}`,
            '\u200b',
            'Click the link below to copy the layout:',
            '',
            `${updated.link}`,
            '',
            'Thank you for using ClashPerk! ❤️'
          ].join('\n')
        )
      );

    try {
      await interaction.showModal(modal);

      const row = this.getComponents({
        ...args,
        allow_layout_tracking: true,
        downloads: updated?.downloader?.length || 0
      });
      await interaction.editReply({ components: [row] });

      const modalSubmitInteraction = await interaction.awaitModalSubmit({
        time: 10 * 60 * 1000,
        filter: (action) => action.customId === customId
      });

      return await modalSubmitInteraction.deferUpdate();
    } catch (error) {
      if (
        !(
          error instanceof DiscordjsError &&
          error.code === DiscordjsErrorCodes.InteractionCollectorError
        )
      ) {
        throw error;
      }
    }
  }

  private async viewDownloader(interaction: ButtonInteraction<'cached'>) {
    const layout = await this.collection.findOne({
      messageIds: interaction.message.id,
      guildId: interaction.guild.id
    });
    if (!layout) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: 'Layout data not found.'
      });
    }

    return interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `Total Downloads: ${layout.downloader.length}\n\n${layout.downloader
        .map((id, index) => `${index + 1}. <@${id}>`)
        .join('\n')}`
    });
  }

  private getComponents(args: LayoutCommandArgs) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    const editButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setCustomId(this.createId({ cmd: this.id, defer: false, has_description: !!args.notes }))
      .setLabel('Edit');

    if (args.allow_layout_tracking) {
      const viewersButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId(
          this.createId({
            cmd: this.id,
            defer: false,
            display_viewers: true
          })
        )
        .setLabel(`${args.downloads || 0} ${pluralize('Download', args.downloads || 0)}`);

      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setLabel('Copy Layout')
          .setEmoji(EMOJIS.LINK)
          .setCustomId(
            this.createId({
              cmd: this.id,
              defer: false,
              display_link: true
            })
          )
      );
      row.addComponents(editButton, viewersButton);
    } else {
      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Copy Layout')
          .setURL(args.layout_link!)
      );
      row.addComponents(editButton);
    }

    return row;
  }

  private getUrlFromInteractionComponents(interaction: ButtonInteraction) {
    const actionRow = interaction.message.components[0];
    if (actionRow.type === ComponentType.ActionRow) {
      const button = actionRow.components[0];
      if (button.type === ComponentType.Button) {
        return button.url;
      }
    }
  }
}

export interface LayoutCommandArgs {
  screenshot: string;
  notes?: string;
  has_description?: boolean;
  layout_link?: string;
  display_link?: boolean;
  display_viewers?: boolean;

  downloads?: number;
  allow_layout_tracking?: boolean;
}
