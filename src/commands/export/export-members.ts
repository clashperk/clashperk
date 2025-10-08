import { SheetType } from '@app/entities';
import { APIPlayer } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
import { sum } from 'radash';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet } from '../../struct/google.js';
import { HERO_EQUIPMENT, HERO_PETS, HOME_HEROES, HOME_TROOPS } from '../../util/emojis.js';
import { getExportComponents, unitsFlatten } from '../../util/helper.js';
import { RAW_TROOPS_FILTERED } from '../../util/troops.js';

const achievements = [
  'Gold Grab',
  'Elixir Escapade',
  'Heroic Heist',
  'Games Champion',
  'War League Legend',
  'Unbreakable',
  'Conqueror',
  'Siege Sharer',
  'Sharing is caring',
  'Friend in Need',
  'Aggressive Capitalism',
  'Most Valuable Clanmate'
];

const roleNames: Record<string, string> = {
  member: 'Mem',
  admin: 'Eld',
  coLeader: 'Co',
  leader: 'Lead'
};

const HERO_LIST = Object.keys(HOME_HEROES);
const PET_LIST = Object.keys(HERO_PETS);
const TROOP_LIST = Object.keys(HOME_TROOPS);
const EQUIPMENT_LIST = Object.keys(HERO_EQUIPMENT);

export default class ExportClanMembersCommand extends Command {
  public constructor() {
    super('export-members', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.coc._getClans(clans);

    const members: {
      name: string;
      tag: string;
      displayName: string;
      username: string;
      userId: string;
      clan: string;
      role: string;
      trophies: number;
      leagueTier: string;
      clanRank: number;
      townHallLevel: number;
      warPreference: 'in' | 'out' | undefined;
      achievements: {
        name: string;
        value: number;
      }[];
      heroes: {
        name: string;
        level: number;
      }[];
      pets: {
        name: string;
        level: number;
      }[];
      equipment: {
        name: string;
        level: number;
      }[];
      troops: {
        name: string;
        level: number;
      }[];
      rushed: number;
      heroRem: number;
      labRem: number;
    }[] = [];

    for (const clan of _clans) {
      clan.memberList.sort((a, b) => b.clanRank - a.clanRank);
      const players = await this.client.coc._getPlayers(clan.memberList);

      players.forEach((player, n) => {
        const troopsMap = [...player.heroes, ...player.troops, ...player.spells]
          .filter((tr) => tr.village === 'home')
          .filter((tr) => TROOP_LIST.includes(tr.name))
          .reduce<Record<string, number | null>>((prev, curr) => {
            prev[curr.name] = curr.level;
            return prev;
          }, {});

        const equipmentMap = [...player.heroEquipment]
          .filter((tr) => tr.village === 'home')
          .filter((tr) => EQUIPMENT_LIST.includes(tr.name))
          .reduce<Record<string, number | null>>((prev, curr) => {
            prev[curr.name] = curr.level;
            return prev;
          }, {});

        const payload = {
          name: player.name,
          tag: player.tag,
          displayName: '',
          username: '',
          userId: '',
          clan: clan.name,
          role: roleNames[player.role!],
          trophies: player.trophies,
          leagueTier: player.leagueTier?.name || 'Unranked',
          clanRank: n + 1,
          townHallLevel: player.townHallLevel,
          warPreference: player.warPreference,
          achievements: this.getAchievements(player),
          heroes: HERO_LIST.map((name) => ({ name, level: troopsMap[name] ?? 0 })),
          pets: PET_LIST.map((name) => ({ name, level: troopsMap[name] ?? 0 })),
          troops: TROOP_LIST.map((name) => ({ name, level: troopsMap[name] ?? 0 })),
          equipment: EQUIPMENT_LIST.map((name) => ({ name, level: equipmentMap[name] ?? 0 })),
          rushed: Number(this.rushedPercentage(player)),
          heroRem: Number(this.heroUpgrades(player)),
          labRem: Number(this.labUpgrades(player))
        };
        members.push(payload);
      });
    }

    const linksMap = await this.client.resolver.getLinkedUsersMap(members);
    const guildMembers = await interaction.guild.members.fetch();

    for (const member of members) {
      const link = linksMap[member.tag];
      if (!link) continue;

      const guildMember = guildMembers.get(link.userId);
      member.userId = guildMember?.id ?? link.userId;
      member.username = guildMember?.user.username ?? link.username;
      member.displayName = guildMember?.user.displayName ?? link.displayName;
    }

    members.sort((a, b) => sum(b.heroes, (x) => x.level) - sum(a.heroes, (x) => x.level));
    members.sort((a, b) => b.townHallLevel - a.townHallLevel);

    if (!members.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

    const sheets: CreateGoogleSheet[] = [
      {
        columns: [
          { name: 'NAME', width: 160, align: 'LEFT' },
          { name: 'TAG', width: 120, align: 'LEFT' },
          { name: 'Discord', width: 160, align: 'LEFT' },
          { name: 'Username', width: 160, align: 'LEFT' },
          { name: 'ID', width: 160, align: 'LEFT' },
          { name: 'CLAN', width: 160, align: 'LEFT' },
          { name: 'ROLE', width: 100, align: 'LEFT' },
          { name: 'Trophies', width: 100, align: 'LEFT' },
          { name: 'League Tier', width: 160, align: 'LEFT' },
          { name: 'War Preference', width: 100, align: 'LEFT' },
          { name: 'Town-Hall', width: 100, align: 'RIGHT' },
          { name: 'Rushed %', width: 100, align: 'RIGHT' },
          { name: 'Lab Upgrades Done', width: 100, align: 'RIGHT' },
          { name: 'Hero Upgrades Done', width: 100, align: 'RIGHT' },
          ...HERO_LIST.map((name) => ({ name, width: 100, align: 'RIGHT' })),
          ...PET_LIST.map((name) => ({ name, width: 100, align: 'RIGHT' })),
          ...achievements.map((name) => ({ name, width: 100, align: 'RIGHT' }))
        ],
        rows: members.map((m) => [
          m.name,
          m.tag,
          m.displayName,
          m.username,
          m.userId,
          m.clan,
          m.role,
          m.trophies,
          m.leagueTier,
          m.warPreference,
          m.townHallLevel,
          m.rushed,
          m.labRem,
          m.heroRem,
          ...m.heroes.map((h) => h.level),
          ...m.pets.map((h) => h.level),
          ...m.achievements.map((v) => v.value)
        ]),
        title: 'All Members'
      },
      {
        title: 'Units',
        columns: [
          { name: 'NAME', width: 160, align: 'LEFT' },
          { name: 'TAG', width: 120, align: 'LEFT' },
          { name: 'Town-Hall', width: 100, align: 'RIGHT' },
          { name: 'Rushed %', width: 100, align: 'RIGHT' },
          ...TROOP_LIST.map((name) => ({ name, width: 100, align: 'RIGHT' }))
        ],
        rows: members.map((m) => [m.name, m.tag, m.townHallLevel, m.rushed, ...m.troops.map((h) => h.level)])
      },
      {
        title: 'Equipment',
        columns: [
          { name: 'NAME', width: 160, align: 'LEFT' },
          { name: 'TAG', width: 120, align: 'LEFT' },
          { name: 'Town-Hall', width: 100, align: 'RIGHT' },
          ...EQUIPMENT_LIST.map((name) => ({ name, width: 100, align: 'RIGHT' }))
        ],
        rows: members.map((m) => [m.name, m.tag, m.townHallLevel, ...m.equipment.map((h) => h.level)])
      }
    ];

    const spreadsheet = await this.client.util.createOrUpdateSheet({
      clans,
      guild: interaction.guild,
      sheets,
      label: 'Clan Members',
      sheetType: SheetType.CLAN_MEMBERS
    });

    return interaction.editReply({
      content: `**Clan Members Export** (${clans.map((clan) => clan.name).join(', ')})`,
      components: getExportComponents(spreadsheet)
    });
  }

  private getAchievements(data: APIPlayer) {
    return achievements.map((name) => ({ name, value: data.achievements.find((en) => en.name === name)?.value ?? 0 }));
  }

  private rushedPercentage(data: APIPlayer) {
    const apiTroops = this.apiTroops(data);
    const rem = RAW_TROOPS_FILTERED.reduce(
      (prev, unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        if (unit.village === 'home') {
          prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
          prev.total += unit.levels[data.townHallLevel - 2];
        }
        return prev;
      },
      { total: 0, levels: 0 }
    );
    if (rem.total === 0) return 0;
    return (100 - (rem.levels * 100) / rem.total).toFixed(2);
  }

  private labUpgrades(data: APIPlayer) {
    const apiTroops = this.apiTroops(data);
    const rem = RAW_TROOPS_FILTERED.reduce(
      (prev, unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        if (unit.category !== 'hero' && unit.village === 'home') {
          prev.levels += apiTroop?.level ?? 0;
          prev.total += unit.levels[data.townHallLevel - 1];
        }
        return prev;
      },
      { total: 0, levels: 0 }
    );
    if (rem.total === 0) return 0;
    return ((rem.levels * 100) / rem.total).toFixed(2);
  }

  private heroUpgrades(data: APIPlayer) {
    const apiTroops = this.apiTroops(data);
    const rem = RAW_TROOPS_FILTERED.reduce(
      (prev, unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        if (unit.category === 'hero' && unit.village === 'home') {
          prev.levels += apiTroop?.level ?? 0;
          prev.total += unit.levels[data.townHallLevel - 1];
        }
        return prev;
      },
      { total: 0, levels: 0 }
    );
    if (rem.total === 0) return 0;
    return ((rem.levels * 100) / rem.total).toFixed(2);
  }

  private apiTroops(data: APIPlayer) {
    return unitsFlatten(data, { withEquipment: false });
  }
}
