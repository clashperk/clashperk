import { SheetType } from '@app/entities';
import { CommandInteraction } from 'discord.js';
import { unique } from 'radash';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet } from '../../struct/google.js';
import { IRosterCategory, rosterLabel } from '../../struct/roster-manager.js';
import { getExportComponents } from '../../util/helper.js';
import { Util } from '../../util/toolkit.js';

export default class RosterExportCommand extends Command {
  public constructor() {
    super('export-rosters', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { category?: string }) {
    let rosters = await this.client.rosterManager.list(interaction.guildId, true);
    if (args.category) rosters = rosters.filter((roster) => roster.category === args.category);

    if (!rosters.length) return interaction.editReply({ content: 'No rosters found.' });

    const categories = await this.client.rosterManager.getCategories(interaction.guildId);
    const categoriesMap = categories.reduce<Record<string, IRosterCategory>>(
      (prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
      {}
    );

    const sheets: CreateGoogleSheet[] = rosters.map((roster, idx) => ({
      title: Util.escapeSheetName(`${rosterLabel(roster)} (${idx + 1})`),
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
          member.clan?.tag === roster.clan?.tag ? 'Yes' : 'No',
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

    const hasDetached = rosters.some((roster) => !roster.clan);
    const linked = hasDetached ? await this.client.storage.find(interaction.guildId) : [];
    const tags = unique([
      ...linked.map((link) => link.tag),
      ...(rosters.map((roster) => roster.clan?.tag).filter((tag) => tag) as string[])
    ]);
    const clans = await this.client.redis.getClans(tags);

    const allRosterMembers = rosters.flatMap((roster) =>
      roster.members.map((member) => ({
        ...member,
        roster: {
          name: roster.name,
          clan: roster.clan
        }
      }))
    );
    const allClanMembers = clans.flatMap((clan) =>
      clan.memberList.map((member) => ({
        member,
        clan: {
          name: clan.name,
          tag: clan.tag
        }
      }))
    );

    const allRosterMembersTags = allRosterMembers.map((member) => member.tag);
    const missingMembers = allClanMembers.filter((clanMember) => !allRosterMembersTags.includes(clanMember.member.tag));
    const linksMap = await this.client.resolver.getLinkedUsersMap(missingMembers.map((member) => member.member));

    sheets.push(
      {
        title: Util.escapeSheetName('All Members'),
        columns: [
          { name: 'Player Name', align: 'LEFT', width: 160 },
          { name: 'Player Tag', align: 'LEFT', width: 120 },
          { name: 'Roster', align: 'LEFT', width: 160 },
          { name: 'Roster Clan', align: 'LEFT', width: 160 },
          { name: 'In Clan?', align: 'LEFT', width: 120 },
          { name: 'Current Clan', align: 'LEFT', width: 160 },
          { name: 'Current ClanTag', align: 'LEFT', width: 120 },
          { name: 'Discord', align: 'LEFT', width: 160 },
          { name: 'War Preference', align: 'LEFT', width: 100 },
          { name: 'Group', align: 'LEFT', width: 160 },
          { name: 'Town Hall', align: 'RIGHT', width: 100 },
          { name: 'Combined Heroes', align: 'RIGHT', width: 100 }
        ],
        rows: allRosterMembers.map((member) => {
          const key = member.categoryId?.toHexString();
          const category = key && key in categoriesMap ? categoriesMap[key].displayName : '';
          return [
            member.name,
            member.tag,
            member.roster.name,
            member.roster.clan?.name ?? '',
            member.clan?.tag === member.roster.clan?.tag ? 'Yes' : 'No',
            member.clan?.name ?? '',
            member.clan?.tag ?? '',
            member.username ?? '',
            member.warPreference ?? '',
            category,
            member.townHallLevel,
            Object.values(member.heroes).reduce((acc, num) => acc + num, 0)
          ];
        })
      },
      {
        title: Util.escapeSheetName('Missing Members'),
        columns: [
          { name: 'Player Name', align: 'LEFT', width: 160 },
          { name: 'Player Tag', align: 'LEFT', width: 120 },
          { name: 'Town Hall', align: 'RIGHT', width: 100 },
          { name: 'Discord', align: 'LEFT', width: 160 },
          { name: 'Clan', align: 'LEFT', width: 160 },
          { name: 'Clan Tag', align: 'LEFT', width: 120 }
        ],
        rows: missingMembers.map(({ member, clan }) => [
          member.name,
          member.tag,
          member.townHallLevel,
          linksMap[member.tag]?.displayName,
          clan.name,
          clan.tag
        ])
      }
    );

    const spreadsheet = await this.client.util.createOrUpdateSheet({
      clans,
      guild: interaction.guild,
      label: 'Rosters',
      sheets,
      sheetType: SheetType.ROSTERS
    });
    return interaction.editReply({ content: `**Roster Export**`, components: getExportComponents(spreadsheet) });
  }
}
