import { TicketPanelEntity } from '@app/entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { WithId } from 'mongodb';
import { Args, Command } from '../../lib/handlers.js';
import TicketSetupCommand from './ticket-setup.js';

export default class TicketPostCommand extends Command {
  public constructor() {
    super('ticket-post', {
      category: 'tickets',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'SendMessages', 'ViewChannel', 'UseExternalEmojis'],
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      panel_name: { match: 'STRING' }
    };
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { panel_name: string }) {
    const { panel_name } = args;
    if (!panel_name) {
      return interaction.editReply({ content: 'Please provide a panel name.' });
    }

    const setupCmd = this.client.commandHandler.modules.get('ticket-setup') as
      | TicketSetupCommand
      | undefined;

    const panel = await setupCmd?.getPanel(interaction.guildId, panel_name);

    if (!panel) {
      return interaction.editReply({
        content: `Panel **${panel_name}** does not exist. Create it first with \`/ticket setup\`.`
      });
    }

    const embed = this.buildPanelEmbed(panel);
    const row = this.buildPanelButton(panel);

    await interaction.channel!.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `Panel **${panel_name}** posted successfully!` });
  }

  private buildPanelEmbed(panel: WithId<TicketPanelEntity>) {
    const embed = new EmbedBuilder().setColor(panel.embed.color ?? 0x5865f2);

    if (panel.embed.title) embed.setTitle(panel.embed.title);
    if (panel.embed.description) embed.setDescription(panel.embed.description);
    if (panel.embed.imageUrl) embed.setImage(panel.embed.imageUrl);
    if (panel.embed.thumbnailUrl) embed.setThumbnail(panel.embed.thumbnailUrl);
    if (panel.embed.footerText) embed.setFooter({ text: panel.embed.footerText });

    return embed;
  }

  private buildPanelButton(panel: WithId<TicketPanelEntity>) {
    const customId = this.createId({
      cmd: 'ticket-open',
      action: 'open',
      pid: panel._id.toHexString(),
      defer: false
    });

    const cfg = panel.button ?? { label: 'Create Ticket', emoji: '📩', style: ButtonStyle.Primary };

    const btn = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(cfg.label)
      .setStyle(cfg.style ?? ButtonStyle.Primary);

    if (cfg.emoji) btn.setEmoji(cfg.emoji);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
  }
}
