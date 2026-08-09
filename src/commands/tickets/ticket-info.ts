import { Collections, PLAYER_LEAGUE_MAP } from '@app/constants';
import { TicketPanelEntity } from '@app/entities';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { WithId } from 'mongodb';
import { Args, Command } from '../../lib/handlers.js';

export default class TicketInfoCommand extends Command {
  public constructor() {
    super('ticket-info', {
      category: 'tickets',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'SendMessages'],
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
      return interaction.editReply({ content: `Panel **${panel_name}** does not exist.` });
    }

    const ticketCount = await this.client.db
      .collection(Collections.TICKETS)
      .countDocuments({ guildId: interaction.guildId, panelId: panel._id.toHexString() });

    const openCount = await this.client.db.collection(Collections.TICKETS).countDocuments({
      guildId: interaction.guildId,
      panelId: panel._id.toHexString(),
      status: 'open'
    });

    const embed = this.buildInfoEmbed(panel, ticketCount, openCount);
    const warnings = this.buildWarnings(panel);

    const parts = [embed];

    if (warnings.length > 0) {
      const warnEmbed = new EmbedBuilder()
        .setTitle('⚠️ Warnings')
        .setColor(0xeffd5f)
        .setDescription(warnings.join('\n'));
      parts.push(warnEmbed);
    }

    return interaction.editReply({ embeds: parts });
  }

  private buildInfoEmbed(panel: WithId<TicketPanelEntity>, total: number, open: number) {
    const embed = new EmbedBuilder()
      .setTitle(`Panel Info: ${panel.name}`)
      .setColor(panel.embed.color ?? 0x5865f2)
      .addFields(
        { name: 'Embed Title', value: panel.embed.title ?? '*(not set)*', inline: true },
        {
          name: 'Color',
          value: panel.embed.color
            ? `#${panel.embed.color.toString(16).padStart(6, '0')}`
            : '*(default)*',
          inline: true
        },
        { name: 'Buttons', value: String(panel.ticketTypes.length), inline: true },
        { name: 'Total Tickets', value: String(total), inline: true },
        { name: 'Open Tickets', value: String(open), inline: true },
        {
          name: 'Created',
          value: `<t:${Math.floor(panel.createdAt.getTime() / 1000)}:R>`,
          inline: true
        }
      );

    if (panel.ticketTypes.length > 0) {
      const btnList = panel.ticketTypes
        .map((b) => {
          const lines = [
            `**${b.emoji ? `${b.emoji} ` : ''}${b.label}**`,
            `  Ping roles: ${b.pingRoleIds.length > 0 ? b.pingRoleIds.map((id) => `<@&${id}>`).join(', ') : 'none'}`,
            `  Questions: ${b.questions?.length ?? 0}`,
            `  TH min: ${b.thMin ?? 'Any'} | Trophies: ${b.minTrophies ?? 'Any'} | League: ${b.minLeagueTier ? (PLAYER_LEAGUE_MAP[b.minLeagueTier] ?? b.minLeagueTier) : 'Any'}`
          ];
          return lines.join('\n');
        })
        .join('\n\n');

      embed.addFields({ name: 'Button Details', value: btnList.slice(0, 1024), inline: false });
    }

    const logSection = [
      `Button click: ${panel.logChannels.buttonClick ? `<#${panel.logChannels.buttonClick}>` : '*(not set)*'}`,
      `Status change: ${panel.logChannels.statusChange ? `<#${panel.logChannels.statusChange}>` : '*(not set)*'}`,
      `Ticket close: ${panel.logChannels.ticketClose ? `<#${panel.logChannels.ticketClose}>` : '*(not set)*'}`
    ].join('\n');

    embed.addFields({ name: 'Logging', value: logSection, inline: false });

    return embed;
  }

  private buildWarnings(panel: WithId<TicketPanelEntity>): string[] {
    const warnings: string[] = [];

    if (panel.ticketTypes.length === 0) {
      warnings.push('⚠️ No buttons configured — use `/ticket post` after adding buttons.');
    }

    for (const btn of panel.ticketTypes) {
      if (btn.pingRoleIds.length === 0) {
        warnings.push(`⚠️ Button "${btn.label}" has no staff roles — nobody will be pinged.`);
      }
      if (!btn.openCategoryId) {
        warnings.push(
          `⚠️ Button "${btn.label}" has no open category — tickets will be created in the current category.`
        );
      }
    }

    if (!panel.logChannels.ticketClose) {
      warnings.push("⚠️ No ticket-close log channel — transcripts won't be saved anywhere.");
    }

    return warnings;
  }
}
