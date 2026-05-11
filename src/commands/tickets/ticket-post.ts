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

export default class TicketPostCommand extends Command {
  public constructor() {
    super('ticket-post', {
      category: 'tickets',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: [
        'ViewChannel',
        'SendMessages',
        'AttachFiles',
        'EmbedLinks',
        'ReadMessageHistory',
        'ManageMessages',
        'ManageChannels',
        'ManageRoles',
        'CreatePrivateThreads',
        'SendMessagesInThreads',
        'MentionEveryone',
        'UseExternalEmojis'
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

  public async exec(interaction: CommandInteraction<'cached'>, args: { panel_name: string }) {
    const { panel_name } = args;
    if (!panel_name) {
      return interaction.editReply({ content: 'Please provide a panel name.' });
    }

    const panel = await this.client.tickets.getPanel(interaction.guildId, panel_name);

    if (!panel) {
      return interaction.editReply({
        content: `Panel **${panel_name}** does not exist. Create it first with \`/ticket setup\`.`
      });
    }

    const embed = this.buildPanelEmbed(panel);
    const rows = this.buildPanelComponents(panel);

    await interaction.channel!.send({ embeds: [embed], components: rows });
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

  private buildPanelComponents(
    panel: WithId<TicketPanelEntity>
  ): ActionRowBuilder<ButtonBuilder>[] {
    const useButtonMode =
      (panel.displayMode ?? 'menu') === 'buttons' &&
      panel.ticketTypes.length > 0 &&
      panel.ticketTypes.length <= 5;

    const ticketButtons: ButtonBuilder[] = useButtonMode
      ? panel.ticketTypes.map((type) => {
          const customId = this.createId({
            cmd: 'ticket-open',
            action: 'open',
            pid: panel._id.toHexString(),
            bid: type.id,
            defer: false
          });
          const btn = new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(type.label)
            .setStyle(type.buttonStyle ?? ButtonStyle.Primary);
          if (type.emoji) btn.setEmoji(type.emoji);
          return btn;
        })
      : (() => {
          const customId = this.createId({
            cmd: 'ticket-open',
            action: 'open',
            pid: panel._id.toHexString(),
            defer: false
          });
          const cfg = panel.button ?? {
            label: 'Create Ticket',
            emoji: '📩',
            style: ButtonStyle.Primary
          };
          const btn = new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(cfg.label)
            .setStyle(cfg.style ?? ButtonStyle.Primary);
          if (cfg.emoji) btn.setEmoji(cfg.emoji);
          return [btn];
        })();

    const extraBuilt = (panel.extraButtons ?? []).map((eb) => {
      if (eb.url) {
        const b = new ButtonBuilder().setURL(eb.url).setLabel(eb.label).setStyle(ButtonStyle.Link);
        if (eb.emoji) b.setEmoji(eb.emoji);
        return b;
      }
      const b = new ButtonBuilder()
        .setCustomId(this.createId({ cmd: eb.cmd!, ...eb.args, ephemeral: true, defer: false }))
        .setLabel(eb.label)
        .setStyle(eb.style ?? ButtonStyle.Secondary);
      if (eb.emoji) b.setEmoji(eb.emoji);
      return b;
    });

    const chunk = (btns: ButtonBuilder[]) => {
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let i = 0; i < btns.length; i += 5)
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...btns.slice(i, i + 5)));
      return rows;
    };

    if (!extraBuilt.length) return chunk(ticketButtons);

    if ((panel.extraButtonsPlacement ?? 'same-row') === 'same-row') {
      return chunk([...ticketButtons, ...extraBuilt]);
    }
    return [...chunk(ticketButtons), ...chunk(extraBuilt)];
  }
}
