import { BUILDER_BASE_LEAGUE_MAPS, Collections, LEGEND_LEAGUE_ID, PLAYER_LEAGUE_MAPS, Settings, SUPER_SCRIPTS } from '@app/constants';
import { AutoRoleDelaysEntity, ClanStoresEntity, PlayerLinksEntity } from '@app/entities';
import { APIPlayer, UnrankedLeagueData } from 'clashofclans.js';
import { Collection, Guild, GuildMember, GuildMemberEditOptions, PermissionFlagsBits, Role, User } from 'discord.js';
import { UpdateFilter, WithId } from 'mongodb';
import { parallel, sift, unique } from 'radash';
import { Client } from '../struct/client.js';
import { makeAbbr, sumHeroes } from '../util/helper.js';

const roles: { [key: string]: number } = {
  member: 1,
  admin: 2,
  coLeader: 3,
  leader: 4
};

const defaultRoleLabels: Record<string, string> = {
  leader: 'Lead',
  coLeader: 'Co-Lead',
  admin: 'Eld',
  member: 'Mem'
};

const NickActions = {
  DECLINED: 'declined',
  UNSET: 'unset',
  NO_ACTION: 'no-action',
  SET_NAME: 'set-name'
} as const;

export enum NicknamingAccountPreference {
  DEFAULT_ACCOUNT = 'default-account',
  BEST_ACCOUNT = 'best-account',
  DEFAULT_OR_BEST_ACCOUNT = 'default-or-best-account'
}

const OpTypes = [
  'PROMOTED',
  'DEMOTED',
  'JOINED',
  'LEFT',
  'LEAGUE_CHANGE',
  'TOWN_HALL_UPGRADE',
  'NAME_CHANGE',
  'WAR',
  'WAR_REMOVED',
  'BUILDER_LEAGUE_CHANGE'
];

const EMPTY_GUILD_MEMBER_COLLECTION = new Collection<string, GuildMember>();

export class RolesManager {
  private queues = new Map<string, string[]>();
  private changeLogs: Record<string, RolesChangeLog> = {};
  private interval = 1 * 60 * 60 * 1000;

  public constructor(private readonly client: Client) {
    setTimeout(this._roleRefresh.bind(this), 5 * 60 * 1000);
  }

  async exec(clanTag: string, pollingInput: RolesManagerPollingInput) {
    if (pollingInput.state && pollingInput.state === 'inWar') return;
    const memberTags = (pollingInput?.members ?? []).filter((mem) => OpTypes.includes(mem.op)).map((mem) => mem.tag);
    if (!memberTags.length) return;

    const guildIds = await this.client.db.collection<ClanStoresEntity>(Collections.CLAN_STORES).distinct('guild', { tag: clanTag });

    for (const guildId of guildIds) {
      if (!this.client.settings.get(guildId, Settings.USE_AUTO_ROLE, true)) continue;
      if (this.client.settings.hasCustomBot(guildId) && !this.client.isCustom()) continue;

      if (!this.client.guilds.cache.has(guildId)) continue;

      if (this.queues.has(guildId)) {
        this.queues.set(guildId, [...(this.queues.get(guildId) ?? []), ...memberTags]);
        continue; // a queue is already being processed
      }

      this.queues.set(guildId, []);

      await this.trigger({ memberTags, guildId });
    }
  }

  private async trigger({ guildId, memberTags }: { guildId: string; memberTags: string[] }) {
    try {
      await this.updateMany(guildId, { isDryRun: false, logging: false, forced: false, memberTags, reason: 'automatically updated' });
    } finally {
      await this.postTriggerAction(guildId);
    }
  }

  private async postTriggerAction(guildId: string) {
    const queuedMemberTags = this.queues.get(guildId);
    if (queuedMemberTags && queuedMemberTags.length) {
      // reset the queue
      this.queues.set(guildId, []);

      await this.delay(1000);
      this.client.logger.debug(`Completing remaining ${queuedMemberTags.length} queues`, { label: RolesManager.name });
      await this.trigger({ guildId, memberTags: queuedMemberTags });
    } else {
      this.queues.delete(guildId);
    }
  }

  public async getGuildRolesMap(guildId: string): Promise<GuildRolesDto> {
    const clans = await this.client.db.collection<ClanStoresEntity>(Collections.CLAN_STORES).find({ guild: guildId }).toArray();

    const allowNonFamilyLeagueRoles = this.client.settings.get<boolean>(guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE, false);
    const allowNonFamilyTownHallRoles = this.client.settings.get<boolean>(guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS, false);
    const townHallRoles = this.client.settings.get<Record<string, string>>(guildId, Settings.TOWN_HALL_ROLES, {});
    const builderHallRoles = this.client.settings.get<Record<string, string>>(guildId, Settings.BUILDER_HALL_ROLES, {});
    const leagueRoles = this.client.settings.get<Record<string, string>>(guildId, Settings.LEAGUE_ROLES, {});
    const builderLeagueRoles = this.client.settings.get<Record<string, string>>(guildId, Settings.BUILDER_LEAGUE_ROLES, {});
    const familyRoleId = this.client.settings.get<string>(guildId, Settings.FAMILY_ROLE, null);
    const exclusiveFamilyRoleId = this.client.settings.get<string>(guildId, Settings.EXCLUSIVE_FAMILY_ROLE, null);
    const familyLeadersRoles = this.client.settings.get<string[]>(guildId, Settings.FAMILY_LEADERS_ROLE, []);
    const verifiedRoleId = this.client.settings.get<string>(guildId, Settings.ACCOUNT_VERIFIED_ROLE, null);
    const accountLinkedRoleId = this.client.settings.get<string>(guildId, Settings.ACCOUNT_LINKED_ROLE, null);
    const guestRoleId = this.client.settings.get<string>(guildId, Settings.GUEST_ROLE, null);

    const clanRoles = clans.reduce<GuildRolesDto['clanRoles']>((prev, curr) => {
      const roles = curr.roles ?? {};
      prev[curr.tag] ??= {
        roles,
        warRoleId: curr.warRole,
        alias: curr.alias ?? null,
        order: curr.order || 0
      } as GuildRolesDto['clanRoles'][string];
      return prev;
    }, {});

    if (typeof this.client.settings.get(guildId, Settings.VERIFIED_ONLY_CLAN_ROLES) !== 'boolean') {
      await this.client.settings.set(
        guildId,
        Settings.VERIFIED_ONLY_CLAN_ROLES,
        clans.some((clan) => clan.secureRole)
      );
    }

    const verifiedOnlyClanRoles = this.client.settings.get<boolean>(guildId, Settings.VERIFIED_ONLY_CLAN_ROLES, false);
    const eosPushClans = this.client.settings.get<string[]>(guildId, Settings.EOS_PUSH_CLANS, []);
    const eosPushClanRoles = this.client.settings.get<string[]>(guildId, Settings.EOS_PUSH_CLAN_ROLES, []);

    const clanTags = clans.map((clan) => clan.tag);
    const warClanTags = clans.filter((clan) => clan.warRole).map((clan) => clan.tag);

    return {
      guildId,
      clanTags,
      warClanTags,
      allowNonFamilyLeagueRoles,
      allowNonFamilyTownHallRoles,
      familyRoleId,
      exclusiveFamilyRoleId,
      familyLeadersRoles,
      verifiedRoleId,
      accountLinkedRoleId,
      guestRoleId,
      leagueRoles,
      builderLeagueRoles,
      townHallRoles,
      builderHallRoles,
      clanRoles,
      eosPushClans,
      eosPushClanRoles,
      verifiedOnlyClanRoles
    };
  }

  private getTargetedRoles(rolesMap: GuildRolesDto) {
    const leagueRoles = Object.values(rolesMap.leagueRoles).filter((id) => id);
    const builderLeagueRoles = Object.values(rolesMap.builderLeagueRoles).filter((id) => id);
    const townHallRoles = Object.values(rolesMap.townHallRoles).filter((id) => id);
    const builderHallRoles = Object.values(rolesMap.builderHallRoles).filter((id) => id);
    const clanRoles = Object.values(rolesMap.clanRoles ?? {})
      .map((_rMap) => Object.values(_rMap.roles))
      .flat()
      .filter((id) => id);
    const warRoles = Object.values(rolesMap.clanRoles ?? {})
      .map((_rMap) => _rMap.warRoleId)
      .flat()
      .filter((id) => id);

    const targetedRoles: string[] = [
      rolesMap.familyRoleId,
      rolesMap.exclusiveFamilyRoleId,
      rolesMap.guestRoleId,
      rolesMap.verifiedRoleId,
      rolesMap.accountLinkedRoleId,
      ...rolesMap.familyLeadersRoles,
      ...builderHallRoles,
      ...builderLeagueRoles,
      ...warRoles,
      ...leagueRoles,
      ...townHallRoles,
      ...clanRoles,
      ...rolesMap.eosPushClanRoles
    ].filter((id) => id);

    return {
      targetedRoles: [...new Set(targetedRoles)],
      warRoles: [...new Set(warRoles)]
    };
  }

  public getPlayerRoles(players: PlayerRolesInput[], rolesMap: GuildRolesDto) {
    const { targetedRoles } = this.getTargetedRoles(rolesMap);

    let rolesToInclude: string[] = [];

    const playerClanTags = players.filter((player) => player.clanTag).map((player) => player.clanTag!);
    const inFamily = rolesMap.clanTags.some((clanTag) => playerClanTags.includes(clanTag));
    const isFamilyLeader = players.some(
      (player) =>
        player.clanTag && player.clanRole && ['leader', 'coLeader'].includes(player.clanRole) && rolesMap.clanTags.includes(player.clanTag)
    );
    const isExclusiveFamily =
      players.length > 0 && players.every((player) => player.clanTag && player.clanRole && rolesMap.clanTags.includes(player.clanTag));

    for (const player of players) {
      for (const clanTag in rolesMap.clanRoles) {
        const targetClan = rolesMap.clanRoles[clanTag];
        if (player.warClanTags.includes(clanTag) && targetClan.warRoleId) {
          rolesToInclude.push(targetClan.warRoleId);
        }

        if (rolesMap.verifiedOnlyClanRoles && !player.isVerified) continue;

        const targetClanRolesMap = targetClan.roles ?? {};
        const highestRole = this.getHighestRole(players, clanTag, targetClanRolesMap);
        if (highestRole) {
          rolesToInclude.push(targetClanRolesMap[highestRole], targetClanRolesMap['everyone']);
        }
      }

      // EOS Push Role
      if (
        player.clanTag &&
        (player.leagueId === LEGEND_LEAGUE_ID || player.trophies >= 5000) &&
        rolesMap.eosPushClans.includes(player.clanTag)
      ) {
        rolesToInclude.push(...rolesMap.eosPushClanRoles);
      }

      // Town Hall Roles
      if (rolesMap.allowNonFamilyTownHallRoles || (inFamily && !rolesMap.allowNonFamilyTownHallRoles)) {
        rolesToInclude.push(rolesMap.townHallRoles[player.townHallLevel]);
      }
      // Builder Hall Roles
      if (rolesMap.allowNonFamilyTownHallRoles || (inFamily && !rolesMap.allowNonFamilyTownHallRoles)) {
        rolesToInclude.push(rolesMap.builderHallRoles[player.builderHallLevel]);
      }
      // League Roles
      if (rolesMap.allowNonFamilyLeagueRoles || (inFamily && !rolesMap.allowNonFamilyLeagueRoles)) {
        rolesToInclude.push(rolesMap.leagueRoles[PLAYER_LEAGUE_MAPS[player.leagueId]]);
      }
      // Builder League Roles
      if (rolesMap.allowNonFamilyLeagueRoles || (inFamily && !rolesMap.allowNonFamilyLeagueRoles)) {
        rolesToInclude.push(rolesMap.builderLeagueRoles[BUILDER_BASE_LEAGUE_MAPS[player.builderLeagueId]]);
      }

      if (player.isVerified) rolesToInclude.push(rolesMap.verifiedRoleId);
      rolesToInclude.push(rolesMap.accountLinkedRoleId);
    }

    if (inFamily) rolesToInclude.push(rolesMap.familyRoleId);
    else rolesToInclude.push(rolesMap.guestRoleId);

    if (isFamilyLeader) rolesToInclude.push(...rolesMap.familyLeadersRoles);
    if (isExclusiveFamily) rolesToInclude.push(rolesMap.exclusiveFamilyRoleId);

    rolesToInclude = rolesToInclude.filter((id) => id);
    const rolesToExclude = targetedRoles.filter((id) => !rolesToInclude.includes(id));

    return {
      targetedRoles: [...new Set(targetedRoles)],
      rolesToInclude: [...new Set(rolesToInclude)],
      rolesToExclude: [...new Set(rolesToExclude)]
    };
  }

  private async getTargetedGuildMembers(guild: Guild, memberTags?: string[]) {
    const guildMembers = await guild.members.fetch().catch(() => EMPTY_GUILD_MEMBER_COLLECTION);
    if (!memberTags) {
      const linkedPlayers = await this.getLinkedPlayersByUserId(guildMembers.map((m) => m.id));
      const linkedUserIds = Object.keys(linkedPlayers);

      return { linkedPlayers, linkedUserIds, guildMembers };
    }

    const linkedPlayers = await this.getLinkedPlayersByPlayerTag(memberTags);
    const linkedUserIds = Object.keys(linkedPlayers);

    return {
      linkedPlayers,
      linkedUserIds,
      guildMembers: guildMembers.filter((member) => linkedUserIds.includes(member.id))
    };
  }

  private async getTargetedGuildMembersForUserOrRole(guild: Guild, userOrRole: User | Role) {
    let guildMembers = EMPTY_GUILD_MEMBER_COLLECTION;
    if (userOrRole instanceof Role) {
      const members = await guild.members.fetch().catch(() => EMPTY_GUILD_MEMBER_COLLECTION);
      guildMembers = members.filter((member) => member.roles.cache.has(userOrRole.id));
    } else {
      const guildMember = await guild.members.fetch(userOrRole.id).catch(() => null);
      guildMembers = guildMember ? EMPTY_GUILD_MEMBER_COLLECTION.clone().set(guildMember.id, guildMember) : EMPTY_GUILD_MEMBER_COLLECTION;
    }

    const linkedPlayers = await this.getLinkedPlayersByUserId(guildMembers.map((m) => m.id));
    const linkedUserIds = Object.keys(linkedPlayers);

    return { linkedPlayers, linkedUserIds, guildMembers };
  }

  public async updateMany(
    guildId: string,
    {
      isDryRun = false,
      memberTags,
      userOrRole,
      logging,
      reason,
      forced = false,
      nicknameOnly = false,
      rolesOnly = false,
      allowNotLinked = true
    }: {
      isDryRun: boolean;
      logging: boolean;
      forced?: boolean;
      userOrRole?: Role | User | null;
      memberTags?: string[];
      allowNotLinked?: boolean;
      nicknameOnly?: boolean;
      rolesOnly?: boolean;
      reason?: string;
    }
  ): Promise<RolesChangeLog | null> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return null;

    const rolesMap = await this.getGuildRolesMap(guildId);
    const { targetedRoles, warRoles } = this.getTargetedRoles(rolesMap);
    const inWarMap = warRoles.length ? await this.getWarRolesMap(rolesMap.warClanTags) : {};

    const isEosRole = userOrRole instanceof Role && rolesMap.eosPushClanRoles.includes(userOrRole.id);

    const { guildMembers, linkedPlayers, linkedUserIds } =
      userOrRole && !isEosRole
        ? await this.getTargetedGuildMembersForUserOrRole(guild, userOrRole)
        : await this.getTargetedGuildMembers(guild, memberTags);

    const targetedMembers = guildMembers.filter(
      (m) =>
        !m.user.bot &&
        (m.roles.cache.hasAny(...targetedRoles) || linkedUserIds.includes(m.id) || (userOrRole && userOrRole instanceof User))
    );
    if (!targetedMembers.size) return null;

    if (logging) {
      this.changeLogs[guildId] ??= {
        changes: [],
        progress: 0,
        memberCount: targetedMembers.size
      };
    }

    for (const member of targetedMembers.values()) {
      if (this.client.inMaintenance) continue;
      const links = linkedPlayers[member.id] ?? [];
      if (!links.length && !allowNotLinked) continue;

      const [players, hasFailed] = await this.getPlayers(links);
      if (hasFailed) continue;

      const roleUpdate = await this.preRoleUpdateAction({
        forced,
        isDryRun,
        member,
        rolesMap,
        players,
        inWarMap
      });
      const nickUpdate = this.preNicknameUpdate(players, member, rolesMap);

      if (isEosRole) {
        roleUpdate.included = roleUpdate.included.filter((id) => id === userOrRole.id);
        roleUpdate.excluded = roleUpdate.excluded.filter((id) => id === userOrRole.id);
        rolesOnly = true;
      }
      // skipping non-eos roles
      if (isEosRole && !roleUpdate.included.length && !roleUpdate.excluded.length) continue;

      const changeLog: RolesChangeLog['changes'][number] = {
        ...roleUpdate,
        nickname: null,
        userId: member.id,
        displayName: member.user.displayName
      };
      const editOptions: GuildMemberEditOptions & { _updated?: boolean } = {
        reason: `${reason} ${players.length !== links.length ? `(${players.length}/${links.length} links)` : ''}`
      };

      if (!nicknameOnly && (roleUpdate.excluded.length || roleUpdate.included.length)) {
        const existingRoleIds = member.roles.cache.map((role) => role.id);
        const roleIdsToSet = [...existingRoleIds, ...roleUpdate.included].filter((id) => !roleUpdate.excluded.includes(id));

        editOptions._updated = true;
        editOptions.roles = roleIdsToSet;
      }

      if (!rolesOnly && nickUpdate.action === NickActions.SET_NAME) {
        editOptions._updated = true;
        editOptions.nick = nickUpdate.nickname;
        changeLog.nickname = `**+** \`${nickUpdate.nickname}\``;
      }

      if (!rolesOnly && nickUpdate.action === NickActions.UNSET && member.nickname) {
        editOptions.nick = null;
        editOptions._updated = true;
        changeLog.nickname = `**-** ~~\`${member.nickname}\`~~`;
      }

      if (editOptions._updated && !isDryRun) {
        const _nickname = member.nickname;
        const editedMember = await member.edit(editOptions);

        if (!rolesOnly && nickUpdate.action === NickActions.SET_NAME && _nickname && _nickname === editedMember.nickname) {
          changeLog.nickname = null;
        }
      }

      const logEntry = this.changeLogs[guildId];
      if (logEntry && logging) {
        logEntry.changes.push(changeLog);
        logEntry.progress += 1;
      }
      if (!logEntry && logging) break;

      if ((roleUpdate.excluded.length || roleUpdate.included.length || nickUpdate.nickname) && !isDryRun) await this.delay(1000);
    }

    return this.changeLogs[guildId] ?? null;
  }

  public async updateOne(user: User, guildId: string, forced = false, allowNotLinked = true) {
    return this.updateMany(guildId, {
      logging: false,
      isDryRun: false,
      forced,
      allowNotLinked,
      userOrRole: user,
      reason: 'account linked or updated'
    });
  }

  private async getWarRolesMap(clanTags: string[]) {
    const result = await Promise.all(clanTags.map((clanTag) => this.client.coc.getCurrentWars(clanTag)));
    const membersMap: Record<string, string[]> = {};

    for (const war of result.flat()) {
      if (war.state === 'notInWar') continue;

      for (const member of war.clan.members) {
        const inWar = ['preparation', 'inWar'].includes(war.state);
        if (!inWar) continue;

        membersMap[member.tag] ??= [];
        membersMap[member.tag].push(war.clan.tag);
      }
    }

    return membersMap;
  }

  private async getPlayers(playerLinks: PlayerLinksEntity[]) {
    const verifiedPlayersMap = Object.fromEntries(playerLinks.map((player) => [player.tag, player.verified]));
    const fetched = await parallel(25, playerLinks, async (link) => {
      const { body, res } = await this.client.coc.getPlayer(link.tag);
      return res.status === 404 ? 'deleted' : !res.ok || !body ? 'failed' : body;
    });

    const filtered = fetched.filter((result): result is APIPlayer => result !== 'deleted' && result !== 'failed');
    const players = filtered.map((player) => ({ ...player, verified: verifiedPlayersMap[player.tag] }));
    const hasFailed = fetched.some((result) => result === 'failed');

    return [players, hasFailed] as const;
  }

  private async getLinkedPlayersByUserId(userIds: string[]) {
    const players = await this.client.db
      .collection<PlayerLinksEntity>(Collections.PLAYER_LINKS)
      .find({ userId: { $in: userIds } })
      .sort({ order: 1 })
      .toArray();

    return players.reduce<Record<string, PlayerLinksEntity[]>>((record, link) => {
      if (link.deleted) return record;
      record[link.userId] ??= [];
      record[link.userId].push(link);
      return record;
    }, {});
  }

  private async getLinkedPlayersByPlayerTag(playerTags: string[]) {
    const players = await this.client.db
      .collection(Collections.PLAYER_LINKS)
      .aggregate<PlayerLinksEntity>([
        {
          $match: { tag: { $in: playerTags } }
        },
        {
          $lookup: {
            from: Collections.PLAYER_LINKS,
            localField: 'userId',
            foreignField: 'userId',
            as: 'links'
          }
        },
        {
          $unwind: {
            path: '$links'
          }
        },
        {
          $replaceRoot: {
            newRoot: '$links'
          }
        },
        {
          $sort: { order: 1 }
        }
      ])
      .toArray();

    return players.reduce<Record<string, PlayerLinksEntity[]>>((record, link) => {
      if (link.deleted) return record;
      record[link.userId] ??= [];
      record[link.userId].push(link);
      return record;
    }, {});
  }

  private async preRoleUpdateAction({
    isDryRun,
    forced,
    member,
    rolesMap,
    inWarMap,
    players
  }: {
    isDryRun: boolean;
    forced: boolean;
    member: GuildMember;
    rolesMap: GuildRolesDto;
    inWarMap: Record<string, string[]>;
    players: (APIPlayer & { verified: boolean })[];
  }) {
    const playerList = players.map(
      (player) =>
        ({
          name: player.name,
          tag: player.tag,
          townHallLevel: player.townHallLevel,
          builderHallLevel: player.builderHallLevel ?? 0,
          leagueId: player.league?.id ?? UnrankedLeagueData.id,
          builderLeagueId: player.builderBaseLeague?.id ?? 0,
          clanRole: player.role ?? null,
          clanName: player.clan?.name ?? null,
          clanTag: player.clan?.tag ?? null,
          trophies: player.trophies,
          isVerified: player.verified,
          warClanTags: inWarMap[player.tag] ?? []
        }) satisfies PlayerRolesInput
    );

    const playerRolesMap = this.getPlayerRoles(playerList, rolesMap);
    return this.handleRoleDeletionDelays({
      isDryRun,
      forced,
      member,
      rolesToExclude: playerRolesMap.rolesToExclude,
      rolesToInclude: playerRolesMap.rolesToInclude,
      rolesExcludedFromDelays: sift([rolesMap.verifiedRoleId, rolesMap.accountLinkedRoleId])
    });
  }

  private async handleRoleDeletionDelays({
    member,
    rolesToExclude,
    rolesToInclude,
    isDryRun,
    forced,
    rolesExcludedFromDelays
  }: {
    member: GuildMember;
    rolesToExclude: string[];
    rolesToInclude: string[];
    isDryRun: boolean;
    forced: boolean;
    rolesExcludedFromDelays: string[];
  }) {
    const deletionDelay = this.client.settings.get<number>(member.guild, Settings.ROLE_REMOVAL_DELAYS, 0);
    const additionDelay = this.client.settings.get<number>(member.guild, Settings.ROLE_ADDITION_DELAYS, 0);
    if ((!deletionDelay && !additionDelay) || forced) {
      return this.checkRoles({ member, rolesToExclude, rolesToInclude });
    }

    const collection = this.client.db.collection<AutoRoleDelaysEntity>(Collections.AUTO_ROLE_DELAYS);
    const delay = await collection.findOne({ guildId: member.guild.id, userId: member.user.id });

    const freeToDelete: string[] = [...rolesExcludedFromDelays];
    const freeToAdd: string[] = [...rolesExcludedFromDelays];

    const update: UpdateFilter<AutoRoleDelaysEntity> = {};
    if (deletionDelay) {
      const delayedFor = new Date(Date.now() + deletionDelay).getTime();

      for (const [roleId, _delayed] of Object.entries(delay?.deletionDelays ?? {})) {
        // if the time is right or the player is back
        if (Date.now() > _delayed || rolesToInclude.includes(roleId)) {
          update.$unset = { ...update.$unset, [`deletionDelays.${roleId}`]: '' };
        }
        if (Date.now() > _delayed) {
          freeToDelete.push(roleId);
        }
      }

      for (const roleId of rolesToExclude.filter((id) => member.roles.cache.has(id))) {
        if (delay && delay.deletionDelays?.[roleId]) continue;
        if (rolesExcludedFromDelays.includes(roleId)) continue;
        update.$min = { ...update.$min, [`deletionDelays.${roleId}`]: delayedFor };
      }
    }

    if (additionDelay) {
      const delayedFor = new Date(Date.now() + additionDelay).getTime();

      for (const [roleId, _delayed] of Object.entries(delay?.additionDelays ?? {})) {
        // if the time is right or the player is gone again
        if (Date.now() > _delayed || rolesToExclude.includes(roleId)) {
          update.$unset = { ...update.$unset, [`additionDelays.${roleId}`]: '' };
        }
        if (Date.now() > _delayed) {
          freeToAdd.push(roleId);
        }
      }

      for (const roleId of rolesToInclude.filter((id) => !member.roles.cache.has(id))) {
        if (delay && delay.additionDelays?.[roleId]) continue;
        if (rolesExcludedFromDelays.includes(roleId)) continue;
        update.$min = { ...update.$min, [`additionDelays.${roleId}`]: delayedFor };
      }
    }

    if (Object.getOwnPropertyNames(update).length && !isDryRun) {
      await collection.updateOne(
        { guildId: member.guild.id, userId: member.user.id },
        { ...update, $setOnInsert: { createdAt: new Date() }, $set: { updatedAt: new Date() } },
        { upsert: true }
      );
    }

    return this.checkRoles({
      member,
      rolesToInclude: additionDelay ? rolesToInclude.filter((id) => freeToAdd.includes(id)) : rolesToInclude,
      rolesToExclude: deletionDelay ? rolesToExclude.filter((id) => freeToDelete.includes(id)) : rolesToExclude
    });
  }

  private getPreferredPlayer(players: APIPlayer[], rolesMap: GuildRolesDto) {
    const accountPreference = this.client.settings.get<NicknamingAccountPreference>(
      rolesMap.guildId,
      Settings.NICKNAMING_ACCOUNT_PREFERENCE,
      NicknamingAccountPreference.DEFAULT_OR_BEST_ACCOUNT
    );

    const defaultAccount = players.at(0);
    const inFamilyPlayers = players.filter((player) => player.clan && rolesMap.clanTags.includes(player.clan.tag));
    inFamilyPlayers.sort((a, b) => b.townHallLevel ** (b.townHallWeaponLevel ?? 1) - a.townHallLevel ** (a.townHallWeaponLevel ?? 1));
    inFamilyPlayers.sort((a, b) => sumHeroes(b) - sumHeroes(a));
    inFamilyPlayers.sort((a, b) => b.townHallLevel - a.townHallLevel);

    const bestAccount = inFamilyPlayers.at(0);

    if (accountPreference === NicknamingAccountPreference.DEFAULT_OR_BEST_ACCOUNT) {
      if (defaultAccount?.clan && rolesMap.clanTags.includes(defaultAccount.clan.tag)) {
        return {
          player: defaultAccount,
          inFamilyPlayers,
          inFamily: true
        };
      }

      return {
        player: bestAccount,
        inFamilyPlayers
      };
    }

    if (accountPreference === NicknamingAccountPreference.BEST_ACCOUNT) {
      return {
        player: bestAccount,
        inFamilyPlayers
      };
    }

    return {
      player: defaultAccount,
      inFamilyPlayers
    };
  }

  public preNicknameUpdate(players: APIPlayer[], member: GuildMember, rolesMap: GuildRolesDto) {
    if (member.id === member.guild.ownerId) return { action: NickActions.DECLINED };
    if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) return { action: NickActions.DECLINED };
    if (member.guild.members.me.roles.highest.position <= member.roles.highest.position) return { action: NickActions.DECLINED };

    const isNickNamingEnabled = this.client.settings.get<boolean>(rolesMap.guildId, Settings.AUTO_NICKNAME, false);
    if (!isNickNamingEnabled) return { action: NickActions.NO_ACTION };

    if (!players.length) return { action: NickActions.UNSET };
    const { player, inFamilyPlayers } = this.getPreferredPlayer(players, rolesMap);
    if (!player) return { action: NickActions.UNSET };

    const familyFormat = this.client.settings.get<string>(rolesMap.guildId, Settings.FAMILY_NICKNAME_FORMAT);
    const nonFamilyFormat = this.client.settings.get<string>(rolesMap.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT);

    const inFamily = player.clan && rolesMap.clanTags.includes(player.clan.tag);
    const clanAlias = player.clan && inFamily ? rolesMap.clanRoles[player.clan.tag]?.alias || makeAbbr(player.clan.name) : null;

    const sortedClanAliases = inFamilyPlayers
      .map((player) => ({
        alias: rolesMap.clanRoles[player.clan!.tag]?.alias,
        order: rolesMap.clanRoles[player.clan!.tag]?.order
      }))
      .filter((_record) => _record.alias)
      .sort((a, b) => a.order - b.order)
      .map((_record) => _record.alias as string);
    const clanAliases = inFamily ? unique([clanAlias, ...sortedClanAliases]) : null;

    const format = inFamily ? familyFormat : nonFamilyFormat;
    if (!format) return { action: NickActions.UNSET };

    const nickname = this.getFormattedNickname(
      member.guild.id,
      {
        name: player.name,
        displayName: member.user.displayName,
        username: member.user.username,
        townHallLevel: player.townHallLevel,
        alias: clanAlias,
        aliases: clanAliases?.join(' | ') ?? null,
        clan: player.clan && inFamily ? player.clan.name : null,
        role: player.role && inFamily ? player.role : null
      },
      format
    ).slice(0, 32);

    if (!nickname) return { action: NickActions.UNSET };
    if (member.nickname === nickname) return { action: NickActions.NO_ACTION };

    return { action: NickActions.SET_NAME, nickname };
  }

  private checkRoles({ member, rolesToExclude, rolesToInclude }: AddRoleInput) {
    if (member.user.bot) return { included: [], excluded: [] };
    if (!rolesToExclude.length && !rolesToInclude.length) return { included: [], excluded: [] };
    if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) return { included: [], excluded: [] };

    const excluded = rolesToExclude.filter((id) => this.checkRole(member.guild, id) && member.roles.cache.has(id));
    const included = rolesToInclude.filter((id) => this.checkRole(member.guild, id) && !member.roles.cache.has(id));

    return { included, excluded };
  }

  private checkRole(guild: Guild, roleId: string) {
    const role = guild.roles.cache.get(roleId);
    return guild.members.me && role && !role.managed && guild.members.me.roles.highest.position > role.position && role.id !== guild.id;
  }

  private getHighestRole(
    players: PlayerRolesInput[],
    clanTag: string,
    /** Clan specific roles map. If a specific role is not set, skip it; */
    clanRoles: Record<string, string>
  ) {
    const playerRoles = players
      .filter((player) => player.clanTag && player.clanTag === clanTag && player.clanRole)
      .map((player) => player.clanRole!);

    return (
      playerRoles
        // making sure the highest roles are actually set
        .filter((role) => clanRoles[role])
        .sort((a, b) => roles[b] - roles[a])
        // if none of the in-game roles are set and player is in the clan, return everyone role;
        .at(0) ?? (playerRoles.length ? 'everyone' : null)
    );
  }

  private getFormattedNickname(
    guildId: string,
    player: {
      name: string;
      townHallLevel: number;
      role?: string | null;
      clan?: string | null;
      alias?: string | null;
      aliases?: string | null;
      displayName: string;
      username: string;
    },
    format: string
  ) {
    const roleLabels = this.client.settings.get<Record<string, string>>(guildId, Settings.ROLE_REPLACEMENT_LABELS, {});
    return format
      .replace(/{NAME}|{PLAYER_NAME}/gi, player.name)
      .replace(/{TH}|{TOWN_HALL}/gi, player.townHallLevel.toString())
      .replace(/{TH_SMALL}|{TOWN_HALL_SMALL}/gi, this.getTownHallSuperScript(player.townHallLevel))
      .replace(/{ROLE}|{CLAN_ROLE}/gi, player.role ? roleLabels[player.role] || defaultRoleLabels[player.role] : '')
      .replace(/{ALIAS}|{CLAN_ALIAS}/gi, player.alias ?? '')
      .replace(/{ALIASES}|{CLAN_ALIASES}/gi, player.aliases ?? '')
      .replace(/{CLAN}|{CLAN_NAME}/gi, player.clan ?? '')
      .replace(/{DISCORD}|{DISCORD_NAME}/gi, player.displayName)
      .replace(/{USERNAME}|{DISCORD_USERNAME}/gi, player.username)
      .trim();
  }

  private getTownHallSuperScript(num: number) {
    if (num >= 0 && num <= 9) {
      return SUPER_SCRIPTS[num];
    }

    return num
      .toString()
      .split('')
      .map((num) => SUPER_SCRIPTS[num])
      .join('');
  }

  public getFilteredChangeLogs(queue: RolesChangeLog | null) {
    const roleChanges = queue?.changes.filter(({ excluded, included, nickname }) => included.length || excluded.length || nickname) ?? [];
    return roleChanges;
  }

  public getChangeLogs(guildId: string): RolesChangeLog | null {
    return this.changeLogs[guildId] ?? null;
  }

  public clearChangeLogs(guildId: string) {
    delete this.changeLogs[guildId];
  }

  private delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  private async _roleRefresh() {
    const collection = this.client.db.collection<AutoRoleDelaysEntity>(Collections.AUTO_ROLE_DELAYS);
    const cursor = collection.aggregate<{ _id: string; delays: WithId<AutoRoleDelaysEntity>[] }>([
      {
        $match: {
          guildId: {
            $in: this.client.guilds.cache.map((guild) => guild.id)
          }
        }
      },
      {
        $group: {
          _id: '$guildId',
          delays: {
            $push: '$$ROOT'
          }
        }
      }
    ]);

    try {
      for await (const { delays, _id: guildId } of cursor) {
        if (!this.client.guilds.cache.has(guildId)) continue;
        if (!this.client.settings.get(guildId, Settings.USE_AUTO_ROLE, true)) continue;
        if (this.client.settings.hasCustomBot(guildId) && !this.client.isCustom()) continue;

        const deletionDelay = this.client.settings.get<number>(guildId, Settings.ROLE_REMOVAL_DELAYS, 0);
        const additionDelay = this.client.settings.get<number>(guildId, Settings.ROLE_ADDITION_DELAYS, 0);
        if (!deletionDelay && !additionDelay) continue;

        const invalidDelays = delays.filter((delay) => {
          const roles = [...Object.values(delay.deletionDelays ?? {}), ...Object.values(delay.additionDelays ?? {})];
          return !roles.length;
        });
        if (invalidDelays.length) {
          await collection.deleteOne({ _id: { $in: invalidDelays.map((_delay) => _delay._id) } });
        }

        const expiredDelays = delays.filter((delay) => {
          const roles = [...Object.values(delay.deletionDelays ?? {}), ...Object.values(delay.additionDelays ?? {})];
          return roles.filter((_delayed) => Date.now() > _delayed).length;
        });
        if (!expiredDelays.length) continue;

        const memberTags = await this.client.db
          .collection<PlayerLinksEntity>(Collections.PLAYER_LINKS)
          .distinct('tag', { userId: { $in: expiredDelays.map((_delay) => _delay.userId) } });
        if (!memberTags.length) continue;

        if (this.queues.has(guildId)) {
          this.queues.set(guildId, [...(this.queues.get(guildId) ?? []), ...memberTags]);
          continue; // a queue is already being processed
        }
        this.queues.set(guildId, []);

        await this.trigger({ memberTags, guildId });
      }
    } finally {
      setTimeout(this._roleRefresh.bind(this), this.interval);
    }
  }
}

interface PlayerRolesInput {
  name: string;
  tag: string;
  townHallLevel: number;
  builderHallLevel: number;
  leagueId: number;
  trophies: number;
  builderLeagueId: number;
  isVerified: boolean;
  clanRole: string | null;
  clanTag: string | null;
  clanName: string | null;
  warClanTags: string[];
}

interface GuildRolesDto {
  guildId: string;
  clanTags: string[];
  warClanTags: string[];
  eosPushClans: string[];

  allowNonFamilyTownHallRoles: boolean;
  allowNonFamilyLeagueRoles: boolean;
  verifiedOnlyClanRoles: boolean;

  townHallRoles: { [level: string]: string };
  builderHallRoles: { [level: string]: string };
  leagueRoles: { [leagueId: string]: string };
  builderLeagueRoles: { [leagueId: string]: string };
  clanRoles: {
    [clanTag: string]: {
      roles: { [clanRole: string]: string };
      warRoleId: string;
      alias: string | null;
      order: number;
    };
  };
  guestRoleId: string;
  familyRoleId: string;
  exclusiveFamilyRoleId: string;
  familyLeadersRoles: string[];
  eosPushClanRoles: string[];
  verifiedRoleId: string;
  accountLinkedRoleId: string;
}

interface AddRoleInput {
  member: GuildMember;
  rolesToExclude: string[];
  rolesToInclude: string[];
}

interface RolesChangeLog {
  memberCount: number;
  progress: number;
  changes: {
    userId: string;
    displayName: string;
    included: string[];
    excluded: string[];
    nickname: string | null;
  }[];
}

interface RolesManagerPollingInput {
  state?: string;
  clan: {
    tag: string;
    name: string;
  };
  members: {
    op: string;
    tag: string;
  }[];
}
