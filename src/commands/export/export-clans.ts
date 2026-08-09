import { SheetType } from '@app/entities';
import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createHyperlink } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';

export default class ExportClansCommand extends Command {
  public constructor() {
    super('export-clans', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['AttachFiles', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const [clans, categories] = await Promise.all([
      this.client.storage.find(interaction.guild.id),
      this.client.storage.getOrCreateDefaultCategories(interaction.guild.id)
    ]);
    const clanStoresMap = Object.fromEntries(
      clans.map((clan) => [clan.tag, clan.categoryId?.toHexString()])
    );
    const categoriesMap = Object.fromEntries(
      categories.map((category) => [category.value, category.name])
    );

    const __clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));

    const chunks = [];

    for (const clan of __clans) {
      const leader = clan.memberList.find((member) => member.role === 'leader');
      chunks.push({
        name: clan.name,
        tag: clan.tag,
        level: clan.clanLevel,
        warLog: clan.isWarLogPublic ? 'Public' : 'Private',
        location: clan.location?.name ?? '',
        members: clan.members,
        warLeague: clan.warLeague?.name ?? 'Unranked',
        capitalLeague: clan.capitalLeague?.name ?? 'Unranked',
        category: categoriesMap[clanStoresMap[clan.tag]!],
        clanLeader: leader?.name,
        clanLink: `https://link.clashofclans.com/?action=openclanprofile&tag=${clan.tag.slice(1)}`
      });
    }

    if (!chunks.length) {
      return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
    }

    const sheets: CreateGoogleSheet[] = [
      {
        columns: [
          { name: 'Name', width: 160, align: 'LEFT' },
          { name: 'Tag', width: 120, align: 'LEFT' },
          { name: 'Level', width: 100, align: 'RIGHT' },
          { name: 'Members', width: 100, align: 'RIGHT' },
          { name: 'War Log', width: 100, align: 'LEFT' },
          { name: 'Location', width: 160, align: 'LEFT' },
          { name: 'War League', width: 160, align: 'LEFT' },
          { name: 'Capital League', width: 160, align: 'LEFT' },
          { name: 'Category', width: 160, align: 'LEFT' },
          { name: 'Clan Leader', width: 160, align: 'LEFT' },
          { name: 'Clan Link', width: 160, align: 'LEFT' }
        ],
        rows: chunks.map((chunk) => [
          chunk.name,
          chunk.tag,
          chunk.level,
          chunk.members,
          chunk.warLog,
          chunk.location,
          chunk.warLeague,
          chunk.capitalLeague,
          chunk.category,
          chunk.clanLeader,
          createHyperlink(chunk.clanLink, 'Open in Game')
        ]),
        title: `Clans`
      }
    ];

    const spreadsheet = await this.client.util.createOrUpdateSheet({
      clans: [{ tag: '#00000' }],
      guild: interaction.guild,
      label: 'Clans Export',
      sheets,
      sheetType: SheetType.CLANS
    });

    return interaction.editReply({
      content: `**Clans Export** (${clans.map((clan) => clan.name).join(',')})`,
      components: getExportComponents(spreadsheet)
    });
  }
}
