import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { IRosterCategory } from '../../struct/RosterManager.js';
import { getExportComponents } from '../../util/Helper.js';
import { Util } from '../../util/Util.js';

export default class RosterExportCommand extends Command {
  public constructor() {
    super('export-rosters', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const rosters = await this.client.rosterManager.list(interaction.guildId, true);
    const categories = await this.client.rosterManager.getCategories(interaction.guildId);
    const categoriesMap = categories.reduce<Record<string, IRosterCategory>>(
      (prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
      {}
    );

    const sheets: CreateGoogleSheet[] = rosters.map((roster, idx) => ({
      title: Util.escapeSheetName(`${roster.name} - ${roster.clan.name} (${idx + 1})`),
      columns: [
        { name: 'Player Name', align: 'LEFT', width: 160 },
        { name: 'Player Tag', align: 'LEFT', width: 120 },
        { name: 'In Clan?', align: 'LEFT', width: 120 },
        { name: 'Current Clan', align: 'LEFT', width: 160 },
        { name: 'Current ClanTag', align: 'LEFT', width: 120 },
        { name: 'Discord', align: 'LEFT', width: 160 },
        { name: 'War Preference', align: 'LEFT', width: 100 },
        { name: 'Group', align: 'LEFT', width: 160 },
        { name: 'Town Hall', align: 'RIGHT', width: 100 },
        { name: 'Combined Heroes', align: 'RIGHT', width: 100 }
      ],
      rows: roster.members.map((member) => {
        const key = member.categoryId?.toHexString();
        const category = key && key in categoriesMap ? categoriesMap[key].displayName : '';
        return [
          member.name,
          member.tag,
          member.clan?.tag === roster.clan.tag ? 'Yes' : 'No',
          member.clan?.name ?? '',
          member.clan?.tag ?? '',
          member.username ?? '',
          member.warPreference ?? '',
          category,
          member.townHallLevel,
          Object.values(member.heroes).reduce((acc, num) => acc + num, 0)
        ];
      })
    }));

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Rosters]`, sheets);
    return interaction.editReply({ content: `**Roster Export**`, components: getExportComponents(spreadsheet) });
  }
}
