import { Collections } from '@app/constants';
import { CommandInteraction, Role } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';

const roleNames: Record<string, string> = {
  member: 'Mem',
  admin: 'Eld',
  coLeader: 'Co',
  leader: 'Lead'
};

export default class ExportUsersCommand extends Command {
  public constructor() {
    super('export-users', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { role?: Role }) {
    const { clans } = await this.client.storage.handleSearch(interaction, {});
    if (!clans) return;

    const _clans = await this.client.coc._getClans(clans);
    const membersMap = new Map<string, AggregatedMember>();

    for (const clan of _clans) {
      clan.memberList.forEach((member) => {
        const payload = {
          name: member.name,
          tag: member.tag,
          clan: clan.name,
          clanTag: clan.tag,
          role: roleNames[member.role]
        };
        membersMap.set(member.tag, payload);
      });
    }

    let guildMembers = await interaction.guild.members.fetch();
    if (args.role) {
      guildMembers = guildMembers.filter((member) => !member.user.bot && member.roles.cache.has(args.role!.id));
    } else {
      guildMembers = guildMembers.filter((member) => !member.user.bot);
    }

    if (!guildMembers.size) {
      return interaction.editReply({ content: 'No Discord members found.' });
    }

    const links = await this.client.db
      .collection(Collections.PLAYER_LINKS)
      .find({ userId: { $in: guildMembers.map((m) => m.id) } })
      .toArray();

    const usersMap = links.reduce<Record<string, PlayersReduced[]>>((record, user) => {
      const member = membersMap.get(user.tag);
      const payload = {
        userId: user.userId,
        name: user.name,
        tag: user.tag,
        clan: member?.clan ?? null,
        clanTag: member?.clanTag ?? null,
        role: member?.role ?? null,
        username: user.username,
        isVerified: user.verified ? 'Yes' : 'No'
      };
      record[user.userId] ??= [];
      record[user.userId].push(payload);
      return record;
    }, {});

    const users = guildMembers
      .map((member) => {
        const links = usersMap[member.id] ?? [
          {
            name: '',
            tag: '',
            clan: '',
            clanTag: '',
            role: '',
            isVerified: ''
          }
        ];
        return links.map((user) => ({
          name: user.name,
          tag: user.tag,
          clan: user.clan,
          clanTag: user.clanTag,
          role: user.role,
          isVerified: user.isVerified,
          userId: member.id,
          username: member.user.username,
          displayName: member.displayName
        }));
      })
      .flat();

    const sheets: CreateGoogleSheet[] = [
      {
        title: 'Discord Members',
        columns: [
          { name: 'DisplayName', width: 160, align: 'LEFT' },
          { name: 'Username', width: 160, align: 'LEFT' },
          { name: 'ID', width: 160, align: 'LEFT' },
          { name: 'Name', width: 160, align: 'LEFT' },
          { name: 'Tag', width: 160, align: 'LEFT' },
          { name: 'Verified', width: 100, align: 'LEFT' },
          { name: 'Clan', width: 160, align: 'LEFT' },
          { name: 'Clan Tag', width: 100, align: 'LEFT' },
          { name: 'Role', width: 100, align: 'LEFT' }
        ],
        rows: users.map((user) => [
          user.displayName,
          user.username,
          user.userId,
          user.name,
          user.tag,
          user.isVerified,
          user.clan,
          user.clanTag,
          user.role
        ])
      }
    ];

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Discord Members]`, sheets);
    return interaction.editReply({ content: `**Discord Members Export**`, components: getExportComponents(spreadsheet) });
  }
}

interface AggregatedMember {
  name: string;
  tag: string;
  clan: string;
  clanTag: string;
  role: string;
}

interface PlayersReduced {
  userId: string;
  name: string;
  tag: string;
  username: string;
  clan: string | null;
  clanTag: string | null;
  role: string | null;
  isVerified: string;
}
