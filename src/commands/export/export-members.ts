import { CommandInteraction } from 'discord.js';
import { api } from '../../api/axios.js';
import { Command } from '../../lib/handlers.js';
import { getExportComponents } from '../../util/helper.js';

export default class ExportClanMembersCommand extends Command {
  public constructor() {
    super('export-members', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; auto_export_on?: boolean }
  ) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const { data } = await api.exports.exportClanMembers({
      clanTags: clans.map((clan) => clan.tag),
      guildId: interaction.guildId,
      scheduled: !!args.auto_export_on
    });

    return interaction.editReply({
      content: [
        `**Clan Members Export** (${clans.map((clan) => clan.name).join(', ')})`,
        args.auto_export_on ? '-# Scheduled to update every Sunday at 4:55 UTC' : ''
      ].join('\n'),
      components: getExportComponents(data)
    });
  }
}
