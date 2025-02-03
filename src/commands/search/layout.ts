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
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { Command } from '../../lib/handlers.js';

const LAYOUT_REGEX = /https?:\/\/link.clashofclans.com\/[a-z]{1,2}[\/]?\?action=OpenLayout&id=TH[0-9]{1,2}.*$/;
const ARMY_URL_REGEX = /https?:\/\/link.clashofclans.com\/[a-z]{1,2}[\/]?\?action=CopyArmy&army=[u|s]([\d+x-])+[s|u]?([\d+x-])+/;

export default class LayoutCommand extends Command {
  public constructor() {
    super('layout', {
      category: 'search',
      channel: 'guild',
      defer: true
    });
  }

  public async pre(interaction: BaseInteraction) {
    this.defer = !interaction.isButton();
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: {
      screenshot: string;
      description?: string;
      has_description?: boolean;
      layout_link: string;
      army_link?: string;
      render_army?: boolean;
    }
  ) {
    if (!interaction.isButton()) {
      return this.handleSubmit(interaction, args);
    }

    const isAdmin = this.client.util.isManager(interaction.member) || interaction.message.author.id === interaction.user.id;
    if (!isAdmin) {
      return interaction.reply({ flags: MessageFlags.Ephemeral, content: 'You are not allowed to edit this layout.' });
    }

    const modalCustomId = this.client.uuid(interaction.user.id);
    const customIds = {
      link: this.client.uuid(interaction.user.id),
      description: this.client.uuid(interaction.user.id)
    };
    const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Edit Layout');
    const linkInput = new TextInputBuilder()
      .setCustomId(customIds.link)
      .setLabel('Layout Link')
      .setPlaceholder('Enter Layout Link')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(200)
      .setRequired(true);
    const link = this.getUrlFromInteractionComponents(interaction);
    if (link) linkInput.setValue(link);

    const descriptionInput = new TextInputBuilder()
      .setCustomId(customIds.description)
      .setLabel('Description')
      .setPlaceholder('Write anything you want (markdown, hyperlink and custom emojis are supported)')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(2000)
      .setRequired(false);
    if (interaction.message.content && args.has_description) descriptionInput.setValue(interaction.message.content);

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
      args.description = modalSubmitInteraction.fields.getTextInputValue(customIds.description);

      await modalSubmitInteraction.deferUpdate();

      return await this.handleSubmit(interaction, args);
    } catch (error) {
      if (!(error instanceof DiscordjsError && error.code === DiscordjsErrorCodes.InteractionCollectorError)) {
        throw error;
      }
    }
  }

  public async handleSubmit(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'> | ModalSubmitInteraction<'cached'>,
    args: { screenshot: string; description?: string; layout_link: string; army_link?: string; render_army?: boolean }
  ) {
    if (!LAYOUT_REGEX.test(args.layout_link)) {
      return interaction.followUp({ flags: MessageFlags.Ephemeral, content: 'Invalid layout link was provided.' });
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
    const buildingLabel = ['HV', 'BB2', 'WB'].includes(layoutType) ? layoutTypes[layoutType] : layoutTypes[`CC:${buildingType}`];

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Copy Layout').setURL(args.layout_link))
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId(this.createId({ cmd: this.id, defer: false, has_description: !!args.description }))
          .setLabel('Edit')
      );

    const armyRow = new ActionRowBuilder<ButtonBuilder>();
    const isValidArmyLink = args.army_link && ARMY_URL_REGEX.test(args.army_link);
    if (args.army_link && isValidArmyLink && layoutType === 'HV') {
      armyRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel('View Army')
          .setCustomId(JSON.stringify({ cmd: this.id, render_army: true, defer: false })),
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Copy Army').setURL(args.army_link)
      );
    }

    return interaction.editReply({
      content: args.description || `**${buildingLabel} ${level} Layout**`,
      components: isValidArmyLink ? [row, armyRow] : [row],
      ...(args.screenshot && { files: [new AttachmentBuilder(args.screenshot)] })
    });
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
