import {
  COLOR_CODES,
  Collections,
  DiscordErrorCodes,
  MAX_TOWN_HALL_LEVEL,
  Settings,
  UNRANKED_TIER_ID,
  UNRANKED_WAR_LEAGUE_ID,
  WarType
} from '@app/constants';
import { captureException } from '@sentry/node';
import { APIClan, APIClanMember, APIClanWar, APIPlayer } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  Guild,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuInteraction,
  User,
  WebhookClient,
  time
} from 'discord.js';
import moment from 'moment-timezone';
import { Collection, Filter, ObjectId, WithId } from 'mongodb';
import { EventEmitter } from 'node:events';
import { parallel, unique } from 'radash';
import { RosterCommandSortOptions } from '../util/command.options.js';
import { EMOJIS, HOME_BASE_LEAGUES, TOWN_HALLS } from '../util/emojis.js';
import { Util } from '../util/toolkit.js';
import { Client } from './client.js';
import Google, { CreateGoogleSheet, createGoogleSheet, updateGoogleSheet } from './google.js';

export type RosterSortTypes = (typeof RosterCommandSortOptions)[number]['value'];

const roleNames: Record<string, string> = {
  member: 'Mem',
  admin: 'Eld',
  coLeader: 'Co',
  leader: 'Lead'
};

export const rosterLayoutMap = {
  '#': {
    width: 2,
    label: '#',
    isEmoji: false,
    key: 'index',
    align: 'right',
    name: 'Index',
    description: 'The index of the player in the roster.'
  },
  'TH': {
    width: 2,
    label: 'TH',
    isEmoji: false,
    key: 'townHallLevel',
    align: 'right',
    name: 'Town Hall Level',
    description: 'The Town Hall level of the player.'
  },
  'TH_ICON': {
    width: 1,
    label: EMOJIS.TOWN_HALL,
    isEmoji: true,
    key: 'townHallIcon',
    align: 'left',
    name: 'Town Hall Icon',
    description: 'The Town Hall icon of the player.'
  },
  'DISCORD': {
    width: 12,
    label: 'DISCORD',
    isEmoji: false,
    key: 'displayName',
    align: 'left',
    name: 'Discord Name',
    description: 'The Discord displayName of the player.'
  },
  'USERNAME': {
    width: 12,
    label: 'USERNAME',
    isEmoji: false,
    key: 'username',
    align: 'left',
    name: 'Discord Username',
    description: 'The Discord username of the player.'
  },
  'DISCORD_ID': {
    width: 19,
    label: 'USER ID',
    isEmoji: false,
    key: 'userId',
    align: 'left',
    name: 'Discord User ID',
    description: 'The Discord User ID of the player.'
  },
  'NAME': {
    width: 12,
    label: 'PLAYER',
    isEmoji: false,
    key: 'name',
    align: 'left',
    name: 'Player Name',
    description: 'The name of the player.'
  },
  'TAG': {
    width: 10,
    label: 'TAG',
    isEmoji: false,
    key: 'tag',
    align: 'left',
    name: 'Player Tag',
    description: 'The tag of the player.'
  },
  'CLAN': {
    width: 6,
    label: 'CLAN',
    isEmoji: false,
    key: 'clanName',
    align: 'left',
    name: 'Clan Name / Alias',
    description: 'The clan name of the player.'
  },
  'HERO_LEVEL': {
    width: 4,
    label: 'HERO',
    isEmoji: false,
    key: 'heroes',
    align: 'right',
    name: 'Combined Hero Level',
    description: 'The combined hero level of the player.'
  },
  'ROLE': {
    width: 4,
    label: 'ROLE',
    isEmoji: false,
    key: 'role',
    align: 'left',
    name: 'Role',
    description: 'The role of the player in the clan.'
  },
  'PREF': {
    width: 4,
    label: 'PREF',
    isEmoji: false,
    key: 'warPreference',
    align: 'left',
    name: 'War Preference',
    description: 'The war preference of the player in the clan.'
  },
  'TROPHIES': {
    width: 6,
    label: 'TROPHY',
    isEmoji: false,
    key: 'trophies',
    align: 'right',
    name: 'Trophies',
    description: 'The trophies of the player.'
  },
  'LEAGUE_ICONS': {
    width: 1,
    label: 'LEAGUE',
    isEmoji: true,
    key: 'leagueIcon',
    align: 'left',
    name: 'League Icon',
    description: 'The league icon of the player.'
  }
} as const;

export const DEFAULT_ROSTER_LAYOUT = '#/TH_ICON/DISCORD/NAME/CLAN';
export const DEFAULT_TROPHY_ROSTER_LAYOUT = '#/TH_ICON/TROPHIES/NAME';
export interface IRoster {
  name: string;
  guildId: string;
  maxMembers?: number;
  minTownHall?: number;
  maxTownHall?: number;
  minHeroLevels?: number;
  roleId?: string | null;
  colorCode?: number;
  clan?: {
    tag: string;
    name: string;
    league: {
      id: number;
      name: string;
    };
    badgeUrl: string;
  } | null;
  members: IRosterMember[];
  layout?: string;
  sheetId?: string;
  closed: boolean;
  startTime?: Date | null;
  endTime?: Date | null;
  sortBy?: RosterSortTypes;
  useClanAlias?: boolean;
  maxAccountsPerUser?: number | null;
  rosterImage?: string | null;
  allowUnlinked?: boolean;
  allowMultiSignup?: boolean;
  category: 'GENERAL' | 'CWL' | 'WAR' | 'TROPHY' | 'NO_CLAN';
  webhook?: {
    id: string;
    token: string;
  } | null;
  logChannelId?: string | null;
  allowCategorySelection?: boolean;
  lastUpdated: Date;
  createdAt: Date;
}

export interface IRosterDefaultSettings {
  allowMultiSignup: boolean;
  maxMembers: number;
  minTownHall: number;
  maxTownHall: number;
  minHeroLevels: number;
  layout: string;
  useClanAlias: boolean;
  sortBy: RosterSortTypes;
  colorCode: number;
  allowCategorySelection: boolean;
  allowUnlinked: boolean;
}

export type PlayerWithLink = APIPlayer & {
  user: {
    id: string;
    displayName: string;
    username: string;
  } | null;
};

export interface IRosterCategory {
  displayName: string;
  name: string;
  order: number;
  guildId: string;
  selectable: boolean;
  roleId?: string | null;
  createdAt: Date;
}

export interface IRosterMember {
  name: string;
  tag: string;
  userId: string | null;
  displayName: string | null;
  username: string | null;
  warPreference: 'in' | 'out' | null;
  role: string | null;
  townHallLevel: number;
  heroes: Record<string, number>;
  trophies: number;
  leagueId: number;
  clan?: {
    tag: string;
    name: string;
    alias?: string | null;
  } | null;
  categoryId?: ObjectId | null;
  createdAt: Date;
}

export const RosterEvents = {
  ROSTER_MEMBER_ADDED: 'roster_member_added',
  ROSTER_MEMBER_REMOVED: 'roster_member_removed',
  ROSTER_MEMBER_GROUP_CHANGED: 'roster_member_group_changed'
} as const;

export const ROSTER_MAX_LIMIT = 65;

interface IRosterEvents {
  [RosterEvents.ROSTER_MEMBER_ADDED]: [];
  [RosterEvents.ROSTER_MEMBER_REMOVED]: [name: string];
  [RosterEvents.ROSTER_MEMBER_GROUP_CHANGED]: [];
}

export class RosterManager {
  public rosters: Collection<IRoster>;
  public categories: Collection<IRosterCategory>;
  private readonly queued: Set<string> = new Set();
  private timeoutId?: NodeJS.Timeout;
  private _emitter = new EventEmitter();

  public constructor(private readonly client: Client) {
    this.rosters = this.client.db.collection<IRoster>(Collections.ROSTERS);
    this.categories = this.client.db.collection<IRosterCategory>(Collections.ROSTER_CATEGORIES);

    this.on(RosterEvents.ROSTER_MEMBER_ADDED, this.onRosterMemberAdded.bind(this));
    this.on(RosterEvents.ROSTER_MEMBER_REMOVED, this.onRosterMemberRemoved.bind(this));
    this.on(RosterEvents.ROSTER_MEMBER_GROUP_CHANGED, this.onRosterMemberGroupChanged.bind(this));
  }

  public emit<K extends keyof IRosterEvents>(event: K, ...args: IRosterEvents[K]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - this is fine
    this._emitter.emit(event, ...args);
  }

  public on<K extends keyof IRosterEvents>(event: K, listener: (...args: IRosterEvents[K]) => void) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - this is fine
    this._emitter.on(event, (...args) => listener(...(args as IRosterEvents[K])));
  }

  private async onRosterMemberAdded() {}
  private async onRosterMemberGroupChanged() {}
  private async onRosterMemberRemoved() {}

  public async create(roster: IRoster) {
    const { insertedId } = await this.rosters.insertOne(roster);
    return { ...roster, _id: insertedId };
  }

  public async edit(rosterId: ObjectId, data: Partial<IRoster>) {
    const value = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: data }, { returnDocument: 'after' });
    return value;
  }

  public async delete(rosterId: ObjectId) {
    return this.rosters.deleteOne({ _id: rosterId });
  }

  public async query(query: Filter<IRoster>, withMembers = false) {
    const cursor = this.rosters.aggregate<WithId<IRoster> & { memberCount: number }>([
      { $match: { ...query } },
      { $set: { memberCount: { $size: '$members' } } },
      ...(withMembers ? [] : [{ $set: { members: [] } }]),
      { $sort: { _id: -1 } }
    ]);

    return cursor.toArray();
  }

  public async list(guildId: string, withMembers = false) {
    return this.query({ guildId }, withMembers);
  }

  public async search(guildId: string, query: string) {
    return this.query({ guildId, $text: { $search: query } });
  }

  public async clear(rosterId: ObjectId) {
    const roster = await this.rosters.findOne({ _id: rosterId });
    return this.clearRoster(roster);
  }

  public async close(rosterId: ObjectId) {
    const value = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: { closed: true } }, { returnDocument: 'after' });
    return value;
  }

  public async open(rosterId: ObjectId) {
    const value = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: { closed: false } }, { returnDocument: 'after' });
    return value;
  }

  public async attachSheetId(rosterId: ObjectId, sheetId: string) {
    const value = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: { sheetId } }, { returnDocument: 'after' });
    return value;
  }

  public async get(rosterId: ObjectId) {
    return this.rosters.findOne({ _id: rosterId });
  }

  private async attemptSignup({
    roster,
    player,
    user,
    isOwner,
    isDryRun = false
  }: {
    roster: WithId<IRoster>;
    player: APIPlayer;
    user: { id: string; displayName: string } | null;
    isOwner: boolean;
    isDryRun: boolean;
  }) {
    if (roster.startTime && roster.startTime > new Date()) {
      return {
        success: false,
        message: `This roster will open on ${time(roster.startTime)} (${time(roster.startTime, 'R')})`
      };
    }

    if (this.isClosed(roster)) {
      return {
        success: false,
        message: 'This roster is closed.'
      };
    }

    if (!user && !roster.allowUnlinked) {
      const linkCommand = this.client.commands.LINK_CREATE;
      return {
        success: false,
        message: isOwner
          ? `You are not linked to any players. Please link your account with ${linkCommand} or use the \`allow_unlinked\` option to allow unlinked players to signup.`
          : `This player is not linked to any users. Please link their account with ${linkCommand} or use the \`allow_unlinked\` option to allow unlinked players to signup.`
      };
    }

    const maxMembers = roster.maxMembers ?? ROSTER_MAX_LIMIT;
    if (roster.members.length >= maxMembers) {
      return {
        success: false,
        message: `This roster is full (maximum ${maxMembers} members).`
      };
    }

    if (roster.maxAccountsPerUser && user) {
      const count = roster.members.filter((m) => m.userId === user.id).length;
      if (count >= roster.maxAccountsPerUser) {
        return {
          success: false,
          message: `${isOwner ? 'You have' : 'This player has'} reached the maximum number of accounts allowed per user (${roster.maxAccountsPerUser}).`
        };
      }
    }

    if (roster.minTownHall && player.townHallLevel < roster.minTownHall) {
      return {
        success: false,
        message: `This roster requires a minimum Town Hall level of ${roster.minTownHall}.`
      };
    }

    if (roster.maxTownHall && player.townHallLevel > roster.maxTownHall) {
      return {
        success: false,
        message: `This roster requires a maximum Town Hall level of ${roster.maxTownHall}.`
      };
    }

    const heroes = player.heroes.filter((hero) => hero.village === 'home');
    const sumOfHeroLevels = heroes.reduce((total, curr) => total + curr.level, 0);
    if (roster.minHeroLevels && sumOfHeroLevels < roster.minHeroLevels) {
      return {
        success: false,
        message: `This roster requires a minimum combined hero level of ${roster.minHeroLevels}.`
      };
    }

    if (roster.members.some((m) => m.tag === player.tag)) {
      return {
        success: false,
        message: isOwner ? 'You are already signed up for this roster.' : 'This player is already signed up for this roster.'
      };
    }

    if (!roster.allowMultiSignup && !isDryRun) {
      const dup = await this.rosters.findOne(
        {
          '_id': { $ne: roster._id },
          'closed': false,
          'guildId': roster.guildId,
          'members.tag': player.tag,
          'category': roster.category
        },
        { projection: { members: 0 } }
      );
      if (dup) {
        return {
          success: false,
          message: isOwner
            ? `You are already signed up for another roster (${rosterLabel(dup)})`
            : `This player is already signed up for another roster (${rosterLabel(dup)})`
        };
      }
    }

    if (roster.allowMultiSignup && !isDryRun) {
      const dup = await this.rosters.findOne(
        {
          '_id': { $ne: roster._id },
          'closed': false,
          'guildId': roster.guildId,
          'members.tag': player.tag,
          'allowMultiSignup': false,
          'category': roster.category
        },
        { projection: { members: 0 } }
      );
      if (dup && !dup.allowMultiSignup) {
        return {
          success: false,
          message: isOwner
            ? `You are already signed up for another roster (${rosterLabel(dup)}) that does not allow multi-signup.`
            : `This player is already signed up for another roster (${rosterLabel(dup)}) that does not allow multi-signup.`
        };
      }
    }

    return { success: true, message: 'Success!' };
  }

  public async signup({
    interaction,
    rosterId,
    player,
    user,
    categoryId,
    isDryRun = false
  }: {
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>;
    rosterId: ObjectId;
    player: APIPlayer;
    user: { id: string; displayName: string; username: string } | null;
    categoryId?: string | null;
    isDryRun?: boolean;
  }) {
    const roster = await this.rosters.findOne({ _id: rosterId });
    if (!roster) {
      await interaction.followUp({ content: 'This roster no longer exists.', flags: MessageFlags.Ephemeral });
      return false;
    }

    const isOwner = interaction.user.id === user?.id;
    const attempt = await this.attemptSignup({
      roster,
      player,
      user,
      isOwner,
      isDryRun
    });

    if (!attempt.success) {
      await interaction.followUp({ content: attempt.message, flags: MessageFlags.Ephemeral });
      return false;
    }

    if (isDryRun) return roster; // DRY RUN BABY

    const value = await this.signupUser({ roster, player, user, categoryId });
    if (!value) {
      await interaction.followUp({ content: 'This roster no longer exists.', flags: MessageFlags.Ephemeral });
      return false;
    }

    return value;
  }

  public async selfSignup({
    rosterId,
    player,
    user,
    categoryId,
    isDryRun = false,
    isOwner = true
  }: {
    rosterId: ObjectId;
    player: APIPlayer;
    user: { id: string; displayName: string; username: string } | null;
    categoryId?: string | null;
    isDryRun?: boolean;
    isOwner?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    roster?: WithId<IRoster>;
  }> {
    const roster = await this.rosters.findOne({ _id: rosterId });
    if (!roster) return { success: false, message: 'This roster no longer exists.' };

    const attempt = await this.attemptSignup({
      roster,
      player,
      user,
      isOwner,
      isDryRun
    });

    if (!attempt.success) return attempt;
    if (isDryRun) return { success: true, message: 'Success!', roster };

    const value = await this.signupUser({ roster, player, user, categoryId });
    if (!value) return { success: false, message: 'This roster no longer exists.' };
    return { success: true, message: 'Success!', roster: value };
  }

  private async signupUser({
    roster,
    player,
    user,
    categoryId
  }: {
    roster: WithId<IRoster>;
    player: APIPlayer;
    user: { id: string; displayName: string; username: string } | null;
    categoryId?: string | null;
  }) {
    const category = categoryId ? await this.getCategory(new ObjectId(categoryId)) : null;
    const heroes = player.heroes.filter((hero) => hero.village === 'home');
    const member: IRosterMember = {
      name: player.name,
      tag: player.tag,
      userId: user?.id ?? null,
      username: user?.username ?? null,
      displayName: user?.displayName ?? null,
      warPreference: player.warPreference ?? null,
      role: player.role ?? null,
      trophies: player.trophies,
      leagueId: player.leagueTier?.id ?? UNRANKED_TIER_ID,
      heroes: heroes.reduce((prev, curr) => ({ ...prev, [curr.name]: curr.level }), {}),
      townHallLevel: player.townHallLevel,
      clan: player.clan ? { name: player.clan.name, tag: player.clan.tag } : null,
      categoryId: category ? category._id : null,
      createdAt: new Date()
    };

    const value = await this.rosters.findOneAndUpdate(
      { _id: roster._id },
      { $push: { members: { ...member } } },
      { returnDocument: 'after' }
    );

    if (!value) return null;
    if (!user) return value;

    const roleIds: string[] = [];
    if (roster.roleId) roleIds.push(roster.roleId);
    if (category?.roleId) roleIds.push(category.roleId);

    if (roleIds.length) await this.addRole(value.guildId, roleIds, user.id);
    return value;
  }

  public async optOut(roster: WithId<IRoster>, ...playerTags: string[]) {
    const targetedMembers = roster.members.filter((mem) => playerTags.includes(mem.tag));
    if (!targetedMembers.length) return roster;

    const value = await this.rosters.findOneAndUpdate(
      { _id: roster._id },
      { $pull: { members: { tag: { $in: playerTags } } } },
      { returnDocument: 'after' }
    );
    if (!value) return null;

    const affectedUserIds = targetedMembers.filter((mem) => mem.userId).map((mem) => mem.userId!);
    const affectedUsers = roster.members.filter((mem) => mem.userId && affectedUserIds.includes(mem.userId));

    const grouped = affectedUsers.reduce<Record<string, IRosterMember[]>>((prev, curr) => {
      if (!curr.userId) return prev;
      prev[curr.userId] ??= [];
      prev[curr.userId].push(curr);
      return prev;
    }, {});

    const userGroups = Object.entries(grouped);
    const categories = await this.getCategories(value.guildId);

    for (const [userId, members] of userGroups) {
      const roleIds: string[] = [];
      if (value.roleId && members.length <= 1) roleIds.push(value.roleId);

      // loop through affected members only
      for (const member of members.filter((mem) => playerTags.includes(mem.tag))) {
        if (!member.categoryId) continue;

        const category = categories.find((cat) => cat._id.toHexString() === member.categoryId!.toHexString());
        if (!category) continue;

        const categorizedMembers = members.filter((mem) => mem.categoryId && mem.categoryId.toHexString() === category._id.toHexString());
        if (category.roleId && categorizedMembers.length <= 1) roleIds.push(category.roleId);
      }

      if (roleIds.length) await this.removeRole(value.guildId, roleIds, userId);
    }

    return value;
  }

  public async swapRoster({
    oldRoster,
    player,
    user,
    newRosterId,
    categoryId
  }: {
    oldRoster: WithId<IRoster>;
    player: APIPlayer;
    user: { id: string; displayName: string; username: string } | null;
    newRosterId: ObjectId;
    categoryId: string | null;
  }) {
    const attempt = await this.selfSignup({
      rosterId: newRosterId,
      player,
      user,
      categoryId,
      isOwner: false,
      isDryRun: true
    });
    if (!attempt.success) return attempt;

    await this.optOut(oldRoster, player.tag);

    return this.selfSignup({
      rosterId: newRosterId,
      player,
      user,
      categoryId,
      isOwner: false
    });
  }

  public async swapCategory({
    roster,
    player,
    user,
    newCategoryId
  }: {
    roster: WithId<IRoster>;
    player: APIPlayer;
    user: { id: string; displayName: string } | null;
    newCategoryId: ObjectId | null;
  }) {
    const oldCategoryId = roster.members.find((mem) => mem.tag === player.tag)?.categoryId;
    if (oldCategoryId?.toHexString() === newCategoryId?.toHexString()) return roster;

    if (oldCategoryId) {
      const category = await this.getCategory(oldCategoryId);
      if (category?.roleId && user) await this.removeRole(roster.guildId, [category.roleId], user.id);
    }

    if (newCategoryId) {
      const newCategory = await this.getCategory(newCategoryId);
      if (newCategory?.roleId && user) await this.addRole(roster.guildId, [newCategory.roleId], user.id);
    }

    const value = await this.rosters.findOneAndUpdate(
      { '_id': roster._id, 'members.tag': player.tag },
      { $set: { 'members.$.categoryId': newCategoryId } },
      { returnDocument: 'after' }
    );

    return value;
  }

  private async clearRoster(roster: WithId<IRoster> | null) {
    if (!roster) return null;

    const _categories = await this.getCategories(roster.guildId);
    const categories = _categories.reduce<Record<string, IRosterCategory>>(
      (prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
      {}
    );

    const rolesMap: Record<string, string[]> = {};
    roster.members.forEach((member) => {
      if (member.userId) rolesMap[member.userId] ??= [];
      if (roster.roleId && member.userId) rolesMap[member.userId].push(roster.roleId);
      if (member.categoryId && member.userId) {
        const category = categories[member.categoryId.toHexString()];
        if (category?.roleId) rolesMap[member.userId].push(category.roleId);
      }
    });

    const value = await this.rosters.findOneAndUpdate(
      { _id: roster._id },
      { $set: { members: [], lastUpdated: new Date() }, $unset: { sheetId: '' } },
      { returnDocument: 'after' }
    );

    if (value) this.updateBulkRoles({ roster: value, rolesMap, addRoles: false });
    return value;
  }

  public async getClanAliases(guildId: string, clanTags: string[]) {
    const clans = await this.client.db
      .collection<{ tag: string; alias?: string }>(Collections.CLAN_STORES)
      .find({ guild: guildId, tag: { $in: clanTags } })
      .toArray();
    return clans.reduce<Record<string, string>>((prev, curr) => {
      if (!curr.alias) return prev;
      return { ...prev, [curr.tag]: curr.alias };
    }, {});
  }

  public async updateMembers(roster: WithId<IRoster>, members: IRosterMember[]) {
    const aliases = await this.getClanAliases(roster.guildId, [
      ...new Set(members.filter((mem) => mem.clan?.tag).map((mem) => mem.clan!.tag))
    ]);
    const players = await Promise.all(members.map((mem) => this.client.coc.getPlayer(mem.tag)));
    const { body, res } = roster.clan ? await this.client.coc.getClan(roster.clan.tag) : { body: null, res: null };

    const links = await this.client.db
      .collection(Collections.PLAYER_LINKS)
      .find({ tag: { $in: members.map((mem) => mem.tag) } })
      .toArray();

    const clan = roster.clan;
    if (res?.ok && body && clan) {
      clan.league = { id: body.warLeague?.id ?? UNRANKED_WAR_LEAGUE_ID, name: body.warLeague?.name ?? 'Unranked' };
      clan.badgeUrl = body.badgeUrls.large;
    }

    const _categories = await this.getCategories(roster.guildId);
    const categories = _categories.reduce<Record<string, IRosterCategory>>(
      (prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
      {}
    );

    const rolesMap: Record<string, string[]> = {};
    members.forEach((member, i) => {
      if (member.userId) rolesMap[member.userId] ??= [];
      if (roster.roleId && member.userId) rolesMap[member.userId].push(roster.roleId);
      if (member.categoryId && member.userId) {
        const category = categories[member.categoryId.toHexString()];
        if (category?.roleId) rolesMap[member.userId].push(category.roleId);
      }

      const { body: player, res } = players[i];
      if (!res.ok) return;

      const link = links.find((link) => link.tag === member.tag);
      if (link && member.userId) member.username = link.username;
      if (link && member.userId) member.displayName = link.displayName;

      member.name = player.name;
      member.townHallLevel = player.townHallLevel;
      member.warPreference = player.warPreference ?? null;
      member.role = player.role ?? null;
      member.trophies = player.trophies;
      const heroes = player.heroes.filter((hero) => hero.village === 'home');
      member.heroes = heroes.reduce((prev, curr) => ({ ...prev, [curr.name]: curr.level }), {});
      if (player.clan) member.clan = { name: player.clan.name, tag: player.clan.tag, alias: aliases[player.clan.tag] || null };
      else member.clan = null;
    });

    const value = await this.rosters.findOneAndUpdate(
      { _id: roster._id },
      { $set: { members, clan, lastUpdated: new Date() } },
      { returnDocument: 'after' }
    );

    if (value) {
      // skipping await so we don't block the event loop
      this.updateBulkRoles({ roster: value, rolesMap, addRoles: true });
    }

    return value;
  }

  public getRosterEmbed(roster: IRoster, categories: WithId<IRosterCategory>[], multi: true): EmbedBuilder[];
  public getRosterEmbed(roster: IRoster, categories: WithId<IRosterCategory>[], multi?: false): EmbedBuilder;
  public getRosterEmbed(roster: IRoster, categories: WithId<IRosterCategory>[], multi: boolean = false): EmbedBuilder[] | EmbedBuilder {
    const categoriesMap = categories.reduce<Record<string, IRosterCategory>>(
      (prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
      {}
    );

    const sortKey = roster.sortBy ?? 'SIGNUP_TIME';
    roster.members.sort((a, b) => a.name.localeCompare(b.name));

    switch (sortKey) {
      case 'TOWN_HALL_LEVEL':
        roster.members.sort((a, b) => b.townHallLevel - a.townHallLevel);
        break;
      case 'HERO_LEVEL':
        roster.members.sort((a, b) => this.sum(Object.values(a.heroes)) - this.sum(Object.values(b.heroes)));
        break;
      case 'TH_HERO_LEVEL':
        roster.members
          .sort((a, b) => this.sum(Object.values(b.heroes)) - this.sum(Object.values(a.heroes)))
          .sort((a, b) => b.townHallLevel - a.townHallLevel);
        break;
      case 'PLAYER_NAME':
        roster.members.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'CLAN_NAME':
        roster.members.sort((a, b) => (a.clan?.name ?? '').localeCompare(b.clan?.name ?? ''));
        break;
      case 'DISCORD_NAME':
        roster.members.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
        break;
      case 'DISCORD_USERNAME':
        roster.members.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''));
        break;
      case 'SIGNUP_TIME':
        roster.members.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'TROPHIES':
        roster.members.sort((a, b) => b.trophies - a.trophies);
        roster.members.sort((a, b) => b.leagueId - a.leagueId);
        break;
      default:
        roster.members.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
    }

    const membersGroup = Object.entries(
      roster.members.reduce<Record<string, IRosterMember[]>>((prev, curr) => {
        const key = curr.categoryId?.toHexString();
        const categoryId = key && key in categoriesMap ? key : 'none';
        prev[categoryId] ??= [];
        prev[categoryId].push(curr);
        return prev;
      }, {})
    );

    membersGroup.sort(([a], [b]) => {
      if (a === 'none') return 1;
      if (b === 'none') return -1;
      return categoriesMap[a].order - categoriesMap[b].order;
    });

    const embed = new EmbedBuilder();
    if (roster.colorCode) embed.setColor(roster.colorCode);

    if (roster.clan) {
      embed.setAuthor({
        name: `${roster.clan.name} (${roster.clan.tag})`,
        iconURL: roster.clan.badgeUrl,
        url: this.client.coc.getClanURL(roster.clan.tag)
      });
      embed.setURL(this.client.coc.getClanURL(roster.clan.tag));
    }

    if (roster.category === 'CWL' && roster.clan?.league?.id) {
      embed.setTitle(`${roster.name} (${roster.clan.league.name})`);
    } else {
      embed.setTitle(`${roster.name}`);
    }

    const groups = membersGroup.map(([categoryId, members]) => {
      const categoryLabel = categoryId === 'none' ? '**Ungrouped**' : `**${categoriesMap[categoryId].displayName}**`;
      return {
        categoryLabel,
        members: members.map((mem, i) => {
          const index = `${1 + i}`.padStart(rosterLayoutMap['#'].width, ' ');
          const name = this.snipe(mem.name, rosterLayoutMap.NAME.width);
          const tag = this.snipe(mem.tag, rosterLayoutMap.TAG.width);
          const username = this.snipe(mem.username ?? ' ', rosterLayoutMap.DISCORD.width);
          const displayName = this.snipe(mem.displayName ?? ' ', rosterLayoutMap.USERNAME.width);
          const userId = this.snipe(mem.userId ?? ' ', rosterLayoutMap.DISCORD_ID.width);
          const clanName = roster.useClanAlias
            ? this.snipe(mem.clan?.alias ?? mem.clan?.name ?? ' ', rosterLayoutMap.CLAN.width)
            : this.snipe(mem.clan?.name ?? ' ', rosterLayoutMap.CLAN.width);

          const townHallLevel = `${mem.townHallLevel}`.padStart(rosterLayoutMap.TH.width, ' ');
          const townHallIcon = TOWN_HALLS[mem.townHallLevel];
          const leagueIcon = HOME_BASE_LEAGUES[mem.leagueId || UNRANKED_TIER_ID];
          const trophies = `${mem.trophies}`.padStart(rosterLayoutMap.TROPHIES.width, ' ');
          const heroes = `${this.sum(Object.values(mem.heroes))}`.padEnd(rosterLayoutMap.HERO_LEVEL.width, ' ');
          const role = (mem.role ? roleNames[mem.role] : ' ').padEnd(rosterLayoutMap.ROLE.width, ' ');
          const warPreference = `${mem.warPreference?.toUpperCase() ?? ' '}`.padEnd(rosterLayoutMap.PREF.width, ' ');

          return {
            index,
            name,
            tag,
            userId,
            username,
            displayName,
            clanName,
            townHallLevel,
            townHallIcon,
            leagueIcon,
            heroes,
            role,
            trophies,
            warPreference
          };
        })
      };
    });

    const layoutId = roster.layout ?? DEFAULT_ROSTER_LAYOUT;
    const layouts = layoutId
      .split('/')
      .filter((k) => k in rosterLayoutMap)
      .map((k) => rosterLayoutMap[k as keyof typeof rosterLayoutMap]);

    const heading = layouts
      .map((layout) => {
        const padding = layout.align === 'left' ? 'padEnd' : 'padStart';
        return layout.isEmoji ? layout.label : `\`${layout.label[padding](layout.width, ' ')}\``;
      })
      .join(' ')
      .replace(/` `/g, ' ');

    const [description, ...rest] = Util.splitMessage(
      [
        heading,
        ...groups.flatMap(({ categoryLabel, members }) => [
          `${categoryLabel} - ${members.length}`,
          ...members.map((member) => {
            return layouts
              .map((layout) => (layout.isEmoji ? member[layout.key] : `\`${member[layout.key]}\``))
              .join(' ')
              .replace(/` `/g, ' ');
          })
        ])
      ].join('\n'),
      { maxLength: 4096 }
    );

    const total = `Total ${roster.members.length}/${roster.maxMembers || ROSTER_MAX_LIMIT}`;
    const minTownHall = roster.minTownHall ? ` | Min. TH${roster.minTownHall}` : '';
    const maxTownHall = roster.maxTownHall ? ` | Max. TH${roster.maxTownHall}` : '';
    const rosterRole = roster.roleId ? `Role <@&${roster.roleId}>\n` : '';
    const footer = `${rosterRole}${total}${minTownHall}${maxTownHall}`;

    if (roster.startTime && roster.startTime > new Date()) {
      embed.addFields({
        name: '\u200e',
        value: [`${footer}`, `Signup opens on ${time(roster.startTime)}`].join('\n')
      });
    } else if (roster.endTime) {
      embed.addFields({
        name: '\u200e',
        value: [`${footer}`, `Signup ${this.isClosed(roster) ? '**closed**' : 'closes'} on ${time(roster.endTime)}`].join('\n')
      });
    } else if (roster.closed) {
      embed.addFields({
        name: '\u200e',
        value: [`${footer}`, 'Signup is **closed**'].join('\n')
      });
    } else {
      embed.addFields({ name: '\u200e', value: `${footer}` });
    }

    embed.setDescription(description);
    if (roster.rosterImage) embed.setImage(roster.rosterImage);

    const embeds: EmbedBuilder[] = [embed];
    if (rest.length && roster.members.length <= ROSTER_MAX_LIMIT) {
      for (const value of Util.splitMessage(rest[0], { maxLength: 1024 })) {
        embed.addFields({ name: '\u200e', value });
      }
    } else {
      rest.forEach((value) => {
        const _embed = new EmbedBuilder(embed.toJSON()).setDescription(value);
        if (roster.rosterImage) _embed.setImage(roster.rosterImage);
        embeds.push(_embed);
      });
    }

    return multi ? embeds : embed;
  }

  public getRosterInfoEmbed(roster: IRoster) {
    const embed = new EmbedBuilder();
    embed.setTitle(`${roster.name} ${this.isClosed(roster) ? '[CLOSED]' : ''}`);

    if (roster.clan) {
      embed.setURL(this.client.coc.getClanURL(roster.clan.tag)).setAuthor({
        name: `${roster.clan.name} (${roster.clan.tag})`,
        iconURL: roster.clan.badgeUrl,
        url: this.client.coc.getClanURL(roster.clan.tag)
      });
    }

    embed
      .addFields({
        name: 'Roster Size',
        inline: true,
        value: `${roster.maxMembers ?? ROSTER_MAX_LIMIT} max, ${roster.members.length} signed-up`
      })
      .addFields({
        name: 'Roster Category',
        inline: true,
        value: `${roster.category}`
      })
      .addFields({
        name: 'Town Hall',
        inline: true,
        value: `${roster.minTownHall ?? 2} min, ${roster.maxTownHall ?? MAX_TOWN_HALL_LEVEL} max`
      })
      .addFields({
        name: 'Hero Levels',
        inline: true,
        value: `${roster.minHeroLevels ?? 0} min (combined)`
      })
      .addFields({
        name: 'Allow Multi-Signup',
        inline: true,
        value: roster.allowMultiSignup ? 'Yes' : 'No'
      })
      .addFields({
        name: 'Roster Role',
        inline: true,
        value: roster.roleId ? `<@&${roster.roleId}>` : 'None'
      })
      .addFields({
        name: 'Start Time',
        inline: true,
        value: roster.startTime
          ? `${time(roster.startTime)} ${roster.startTime > new Date() ? `(${time(roster.startTime, 'R')})` : '[STARTED]'}`
          : 'N/A'
      })
      .addFields({
        name: 'End Time',
        inline: true,
        value: roster.endTime ? `${time(roster.endTime)} ${this.isClosed(roster) ? '[CLOSED]' : `(${time(roster.endTime, 'R')})`}` : 'N/A'
      })
      .addFields({
        name: 'Use Clan Alias',
        inline: true,
        value: roster.useClanAlias ? 'Yes' : 'No'
      })
      .addFields({
        name: 'Allow Unlinked Players',
        inline: true,
        value: roster.allowUnlinked ? 'Yes' : 'No'
      })
      .addFields({
        name: 'Allow Users to Select Group',
        inline: true,
        value: roster.allowCategorySelection ? 'Yes' : 'No'
      })
      .addFields({
        name: 'Sorting Order',
        inline: true,
        value: `\`${roster.sortBy ?? 'SIGNUP_TIME'}\``
      })
      .addFields({
        name: 'Roster Layout',
        inline: true,
        value: `\`${roster.layout ?? DEFAULT_ROSTER_LAYOUT}\``
      });

    if (roster.logChannelId) {
      embed.addFields({
        name: 'Log Channel',
        inline: true,
        value: `<#${roster.logChannelId}>`
      });
    }

    if (roster.colorCode) embed.setColor(roster.colorCode);

    return embed;
  }

  public getRosterComponents({ roster, signupDisabled }: { roster: WithId<IRoster>; signupDisabled: boolean }) {
    const isClosed = this.isClosed(roster);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          JSON.stringify({
            cmd: 'roster-post',
            signup_disabled: signupDisabled,
            roster: roster._id.toHexString()
          })
        )
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
    );

    if (!signupDisabled) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(JSON.stringify({ cmd: 'roster-signup', roster: roster._id.toHexString(), signup: true }))
          .setLabel('Signup')
          .setStyle(ButtonStyle.Success)
          .setDisabled(isClosed),
        new ButtonBuilder()
          .setCustomId(JSON.stringify({ cmd: 'roster-signup', roster: roster._id.toHexString(), signup: false }))
          .setLabel('Opt-out')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(isClosed)
      );
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          JSON.stringify({
            cmd: 'roster-settings',
            signup_disabled: signupDisabled,
            roster: roster._id.toHexString()
          })
        )
        .setEmoji(EMOJIS.GEAR)
        .setStyle(ButtonStyle.Secondary)
    );

    return row;
  }

  private async updateBulkRoles({
    rolesMap,
    roster,
    addRoles
  }: {
    roster: WithId<IRoster>;
    rolesMap: Record<string, string[]>;
    addRoles: boolean;
  }) {
    const rosterId = roster._id.toHexString();
    if (this.queued.has(rosterId)) return;
    this.queued.add(rosterId);

    try {
      const guild = this.client.guilds.cache.get(roster.guildId);
      if (!guild) return null;

      const members = await guild.members.fetch().catch(() => null);
      if (!members) return null;

      for (const member of members.values()) {
        const _roles = (rolesMap[member.id] ?? []).filter((id) => this.hasPermission(guild, id));

        const included: string[] = [];
        const excluded: string[] = [];
        const existingRoleIds: string[] = member.roles.cache.map((role) => role.id);

        if (addRoles) {
          const roles = _roles.filter((id) => !member.roles.cache.has(id));
          if (roles.length) included.push(...roles);
        } else {
          const roles = _roles.filter((id) => member.roles.cache.has(id));
          if (roles.length) excluded.push(...roles);
        }

        if (!(member.id in rolesMap) && roster.roleId) {
          const roles = [roster.roleId].filter((id) => this.hasPermission(guild, id) && member.roles.cache.has(id));
          if (roles.length) excluded.push(...roles);
        }

        if (!excluded.length && !included.length) continue;

        const roleIdsToSet = [...existingRoleIds, ...included].filter((id) => !excluded.includes(id));
        await member.edit({ roles: unique(roleIdsToSet, (id) => id) });

        await Util.delay(2000);
      }
    } finally {
      this.queued.delete(rosterId);
    }
  }

  private async addRole(guildId: string, roleIds: string[], userId: string) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return null;

    roleIds = roleIds.filter((id) => this.hasPermission(guild, id));
    if (!roleIds.length) return null;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return null;

    roleIds = roleIds.filter((id) => !member.roles.cache.has(id));
    if (!roleIds.length) return null;

    return member.roles.add(roleIds);
  }

  private async removeRole(guildId: string, roleIds: string[], userId: string) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return null;

    roleIds = roleIds.filter((id) => this.hasPermission(guild, id));
    if (!roleIds.length) return null;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return null;

    roleIds = roleIds.filter((id) => member.roles.cache.has(id));
    if (!roleIds.length) return null;

    return member.roles.remove(roleIds);
  }

  private hasPermission(guild: Guild, roleId: string) {
    const role = guild.roles.cache.get(roleId);
    return (
      role &&
      !role.managed &&
      guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) &&
      guild.members.me.roles.highest.position > role.position
    );
  }

  public isClosed(roster: IRoster) {
    return roster.closed || (roster.endTime ? roster.endTime < new Date() : false);
  }

  private snipe(str: string | number, len = 12) {
    return `\u200e${Util.escapeBackTick(`${str}`).slice(0, len).padEnd(len, ' ')}`;
  }

  private sum(arr: number[]) {
    return arr.reduce((prev, curr) => prev + curr, 0);
  }

  public async getCategories(guildId: string) {
    return this.categories.find({ guildId }, { sort: { order: 1 } }).toArray();
  }

  public async getCategory(categoryId: ObjectId) {
    return this.categories.findOne({ _id: categoryId });
  }

  public async searchCategory(guildId: string, name: string) {
    return this.categories.findOne({ guildId, name: this.formatCategoryName(name) });
  }

  public async createCategory(category: IRosterCategory) {
    category.name = this.formatCategoryName(category.name);
    const { insertedId } = await this.categories.insertOne(category);
    return { ...category, _id: insertedId };
  }

  private formatCategoryName(name: string) {
    return name.toLowerCase().trim().replace(/\s+/g, '_');
  }

  public async deleteCategory(categoryId: ObjectId) {
    return this.categories.deleteOne({ _id: categoryId });
  }

  public async createDefaultGroups(guildId: string) {
    const categories = await this.getCategories(guildId);
    if (categories.length) return null;

    const defaultCategories: IRosterCategory[] = [
      {
        displayName: 'Confirmed',
        name: 'confirmed',
        order: 10,
        guildId,
        selectable: true,
        roleId: null,
        createdAt: new Date()
      },
      {
        displayName: 'Substitute',
        name: 'substitute',
        order: 20,
        guildId,
        selectable: true,
        roleId: null,
        createdAt: new Date()
      }
    ];

    return this.categories.insertMany(defaultCategories);
  }

  public async closeRosters(guildId: string) {
    return this.rosters.updateMany(
      {
        guildId,
        $and: [
          {
            endTime: { $ne: null }
          },
          {
            endTime: { $lt: new Date() }
          }
        ]
      },
      {
        $set: { closed: true }
      }
    );
  }

  public async editCategory(categoryId: ObjectId, data: Partial<IRosterCategory>) {
    if (data.displayName) data.name = this.formatCategoryName(data.displayName);
    const value = await this.categories.findOneAndUpdate({ _id: categoryId }, { $set: data }, { returnDocument: 'after' });
    return value;
  }

  public async getTimezoneId(interaction: CommandInteraction<'cached'>, location?: string) {
    const zone = location ? moment.tz.zone(location) : null;
    if (zone) return zone.name;

    const user = await this.client.db.collection(Collections.USERS).findOne({ userId: interaction.user.id });
    if (!location) {
      if (!user?.timezone) return 'UTC';
      return user.timezone.id;
    }

    const raw = await Google.timezone(location);
    if (!raw) return 'UTC';

    const offset = Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset);
    if (!user?.timezone) {
      await this.client.db.collection(Collections.USERS).updateOne(
        { userId: interaction.user.id },
        {
          $set: {
            username: interaction.user.username,
            displayName: interaction.user.displayName,
            discriminator: interaction.user.discriminator,
            timezone: {
              id: raw.timezone.timeZoneId,
              offset: Number(offset),
              name: raw.timezone.timeZoneName,
              location: raw.location.formatted_address
            }
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }

    return raw.timezone.timeZoneId;
  }

  public convertTime(time: string, timezoneId: string) {
    return moment.tz(time, timezoneId).toDate();
  }

  public getDefaultSettings(guildId: string) {
    return this.client.settings.get<Partial<IRosterDefaultSettings>>(guildId, Settings.ROSTER_DEFAULT_SETTINGS, {});
  }

  public async setDefaultSettings(guildId: string, data: Partial<IRoster>) {
    const settings: Partial<IRosterDefaultSettings> = {
      allowMultiSignup: data.allowMultiSignup,
      allowCategorySelection: data.allowCategorySelection,
      maxMembers: data.maxMembers,
      minHeroLevels: data.minHeroLevels,
      minTownHall: data.minTownHall,
      maxTownHall: data.maxTownHall,
      sortBy: data.sortBy,
      allowUnlinked: data.allowUnlinked,
      layout: data.layout,
      colorCode: data.colorCode,
      useClanAlias: data.useClanAlias
    };
    return this.client.settings.set(guildId, Settings.ROSTER_DEFAULT_SETTINGS, settings);
  }

  public async importMembers(roster: WithId<IRoster>, memberList: { tag: string }[]) {
    const members = await this.getClanMemberLinks(memberList, roster.allowUnlinked);
    for (const member of members) {
      const attempt = await this.client.rosterManager.attemptSignup({
        roster,
        player: member,
        user: member.user,
        isDryRun: false,
        isOwner: false
      });

      if (attempt.success) {
        await this.client.rosterManager.signupUser({
          roster,
          player: member,
          user: member.user,
          categoryId: null
        });
      }
    }
  }

  public async getClanMembers(memberList: APIClanMember[], allowUnlinked = false) {
    const links = await this.client.db
      .collection(Collections.PLAYER_LINKS)
      .find({ tag: { $in: memberList.map((mem) => mem.tag) } })
      .toArray();

    const fetched = await parallel(25, memberList, async (member) => {
      const { body, res } = await this.client.coc.getPlayer(member.tag);
      if (!res.ok || !body) return null;
      return body;
    });
    const players = fetched.filter((_) => _) as APIPlayer[];

    const members: IRosterMember[] = [];
    players.forEach((player) => {
      const link = links.find((link) => link.tag === player.tag);
      if (!link && !allowUnlinked) return;

      const heroes = player.heroes.filter((hero) => hero.village === 'home');
      members.push({
        tag: player.tag,
        name: player.name,
        userId: link?.userId ?? null,
        username: link?.username ?? null,
        displayName: link?.displayName ?? null,
        townHallLevel: player.townHallLevel,
        warPreference: player.warPreference ?? null,
        role: player.role ?? null,
        trophies: player.trophies,
        leagueId: player.leagueTier?.id ?? UNRANKED_TIER_ID,
        heroes: heroes.reduce((prev, curr) => ({ ...prev, [curr.name]: curr.level }), {}),
        clan: player.clan ? { tag: player.clan.tag, name: player.clan.name } : null,
        createdAt: new Date()
      });
    });

    return members;
  }

  public async getClanMemberLinks(memberList: { tag: string }[], allowUnlinked = false) {
    const links = await this.client.db
      .collection(Collections.PLAYER_LINKS)
      .find({ tag: { $in: memberList.map((mem) => mem.tag) } })
      .toArray();
    const players = await this.client.coc._getPlayers(memberList);

    const members: PlayerWithLink[] = [];
    players.forEach((player) => {
      const link = links.find((link) => link.tag === player.tag);
      if (!link && !allowUnlinked) return;

      members.push({
        user: link ? { id: link.userId, displayName: link.displayName, username: link.username } : null,
        ...player
      });
    });

    return members;
  }

  public async exportSheet({
    roster,
    categories,
    clan,
    name
  }: {
    roster: WithId<IRoster>;
    categories: WithId<IRosterCategory>[];
    clan?: APIClan | null;
    name: string;
  }) {
    const signedUp = roster.members.map((member) => member.tag);
    const categoriesMap = categories.reduce<Record<string, IRosterCategory>>(
      (prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
      {}
    );
    const seasonId = moment().date() >= 10 ? moment().format('YYYY-MM') : moment().subtract(1, 'month').format('YYYY-MM');

    const sheets: CreateGoogleSheet[] = [];

    if (!['TROPHY', 'NO_CLAN'].includes(roster.category)) {
      const cwlMembers = !['TROPHY', 'NO_CLAN'].includes(roster.category)
        ? await this.client.rosterManager.getCWLStats(
            roster.members.map((m) => m.tag),
            seasonId
          )
        : {};

      sheets.push({
        title: `${rosterLabel(roster)}`,
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
          { name: 'Combined Heroes', align: 'RIGHT', width: 100 },
          { name: 'Total Attacks', align: 'RIGHT', width: 100 },
          { name: 'Stars', align: 'RIGHT', width: 100 },
          { name: 'Avg. Stars', align: 'RIGHT', width: 100 },
          { name: 'Destruction', align: 'RIGHT', width: 100 },
          { name: 'Avg. Destruction', align: 'RIGHT', width: 100 },
          { name: '3 Stars', align: 'RIGHT', width: 100 },
          { name: '2 Stars', align: 'RIGHT', width: 100 },
          { name: '1 Stars', align: 'RIGHT', width: 100 },
          { name: '0 Stars', align: 'RIGHT', width: 100 },
          { name: 'Missed', align: 'RIGHT', width: 100 },
          { name: 'Defense Stars', align: 'RIGHT', width: 100 },
          { name: 'Defense Avg. Stars', align: 'RIGHT', width: 100 },
          { name: 'Defense Destruction', align: 'RIGHT', width: 100 },
          { name: 'Defense Avg. Destruction', align: 'RIGHT', width: 100 }
        ],
        rows: roster.members.map((member) => {
          const key = member.categoryId?.toHexString();
          const category = key && key in categoriesMap ? categoriesMap[key].displayName : '';
          const cwlMember = cwlMembers[member.tag];
          const inClan = roster.clan ? (member.clan?.tag === roster.clan.tag ? 'Yes' : 'No') : '';
          return [
            member.name,
            member.tag,
            inClan,
            member.clan?.name ?? '',
            member.clan?.tag ?? '',
            member.username ?? '',
            member.warPreference ?? '',
            category,
            member.townHallLevel,
            Object.values(member.heroes).reduce((acc, num) => acc + num, 0),
            cwlMember?.attacks,
            cwlMember?.stars,
            cwlMember?.participated ? (cwlMember.stars / cwlMember.participated).toFixed(2) : '',
            cwlMember?.destruction,
            cwlMember?.participated ? (cwlMember.destruction / cwlMember.participated).toFixed(2) : '',
            cwlMember?.threeStars,
            cwlMember?.twoStars,
            cwlMember?.oneStar,
            cwlMember?.zeroStars,
            cwlMember?.missedAttacks,
            cwlMember?.defenseStars,
            cwlMember?.defenseCount ? (cwlMember.defenseStars / cwlMember.defenseCount).toFixed(2) : '',
            cwlMember?.defenseDestruction,
            cwlMember?.defenseCount ? (cwlMember.defenseDestruction / cwlMember.defenseCount).toFixed(2) : ''
          ];
        })
      });
    }

    if (clan) {
      const clanMembers = await this.client.rosterManager.getClanMembers(clan.memberList, true);
      clanMembers.sort((a) => (signedUp.includes(a.tag) ? -1 : 1));

      sheets.push({
        title: `${clan.name} (${clan.tag})`,
        columns: [
          { name: 'Name', align: 'LEFT', width: 160 },
          { name: 'Tag', align: 'LEFT', width: 120 },
          { name: 'Discord', align: 'LEFT', width: 160 },
          { name: 'War Preference', align: 'LEFT', width: 100 },
          { name: 'Town Hall', align: 'RIGHT', width: 100 },
          { name: 'Clan', align: 'LEFT', width: 160 },
          { name: 'Clan Tag', align: 'LEFT', width: 120 },
          { name: 'Role', align: 'LEFT', width: 100 },
          { name: 'Heroes', align: 'RIGHT', width: 100 },
          { name: 'Signed up?', align: 'LEFT', width: 100 }
        ],
        rows: clanMembers.map((member) => {
          return [
            member.name,
            member.tag,
            member.username ?? '',
            member.warPreference ?? '',
            member.townHallLevel,
            member.clan?.name ?? '',
            member.clan?.tag ?? '',
            member.role ? roleNames[member.role] : '',
            Object.values(member.heroes).reduce((acc, num) => acc + num, 0),
            signedUp.includes(member.tag) ? 'Yes' : 'No'
          ];
        })
      });
    }

    const sheet = roster.sheetId
      ? await updateGoogleSheet(roster.sheetId, sheets, { clear: true, recreate: false, title: `${name} [Roster Export]` })
      : await createGoogleSheet(`${name} [Roster Export]`, sheets);
    if (!roster.sheetId) this.client.rosterManager.attachSheetId(roster._id, sheet.spreadsheetId);
    return sheet;
  }

  public async init() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    try {
      await this.rosters.updateMany(
        {
          $and: [
            {
              endTime: { $ne: null }
            },
            {
              endTime: { $lt: new Date() }
            }
          ]
        },
        {
          $set: { closed: true }
        }
      );
    } finally {
      this.timeoutId = setTimeout(this.init.bind(this), 10 * 60 * 1000);
    }
  }

  public async getCWLStats(playerTags: string[], seasonId: string) {
    const members: Partial<
      Record<
        string,
        {
          name: string;
          tag: string;
          participated: number;
          attacks: number;
          stars: number;
          destruction: number;
          trueStars: number;
          threeStars: number;
          twoStars: number;
          oneStar: number;
          zeroStars: number;
          missedAttacks: number;
          defenseStars: number;
          defenseDestruction: number;
          defenseCount: number;
        }
      >
    > = {};

    if (!playerTags.length) return members;

    const wars = this.client.db.collection<APIClanWar>(Collections.CLAN_WARS).find({
      $or: [
        {
          'clan.members.tag': { $in: playerTags }
        },
        {
          'opponent.members.tag': { $in: playerTags }
        }
      ],
      season: seasonId,
      warType: WarType.CWL
    });

    for await (const data of wars) {
      const clanMemberTags = data.opponent.members.map((m) => m.tag);
      const opponentMemberTags = data.clan.members.map((m) => m.tag);

      for (const playerTag of playerTags) {
        if (![...clanMemberTags, ...opponentMemberTags].includes(playerTag)) continue;

        const clan = data.clan.members.find((m) => m.tag === playerTag) ? data.clan : data.opponent;
        const opponent = data.clan.tag === clan.tag ? data.opponent : data.clan;

        clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
        opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

        const __attacks = clan.members.flatMap((m) => m.attacks ?? []);
        for (const m of clan.members) {
          if (m.tag !== playerTag) continue;

          members[m.tag] ??= {
            name: m.name,
            tag: m.tag,
            participated: 0,
            attacks: 0,
            stars: 0,
            trueStars: 0,
            destruction: 0,
            threeStars: 0,
            twoStars: 0,
            oneStar: 0,
            zeroStars: 0,
            missedAttacks: 0,
            defenseStars: 0,
            defenseDestruction: 0,
            defenseCount: 0
          };

          const member = members[m.tag]!;
          member.participated += 1;
          for (const atk of m.attacks ?? []) {
            const previousBestAttack = this.client.coc.getPreviousBestAttack(__attacks, atk);
            member.attacks += 1;
            member.stars += atk.stars;
            member.trueStars += previousBestAttack ? Math.max(0, atk.stars - previousBestAttack.stars) : atk.stars;
            member.destruction += atk.destructionPercentage;
            member.threeStars += atk.stars === 3 ? 1 : 0;
            member.twoStars += atk.stars === 2 ? 1 : 0;
            member.oneStar += atk.stars === 1 ? 1 : 0;
            member.zeroStars += atk.stars === 0 ? 1 : 0;
          }

          member.missedAttacks += m.attacks?.length ? 0 : 1;
          if (m.bestOpponentAttack) {
            member.defenseStars += m.bestOpponentAttack.stars;
            member.defenseDestruction += m.bestOpponentAttack.destructionPercentage;
            member.defenseCount += 1;
          }
        }
      }
    }

    return members;
  }

  public async rosterChangeLog(options: {
    roster: WithId<IRoster>;
    oldCategory?: IRosterCategory;
    oldRoster?: IRoster;
    user: User;
    action: RosterLog;
    members: IRosterMember[];
    categoryId?: string | null;
    isRetry?: boolean;
  }) {
    const { roster, user, action, members, categoryId } = options;

    const categories = await this.getCategories(roster.guildId);
    const categoryMap = categories.reduce<Record<string, IRosterCategory>>(
      (prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
      {}
    );

    let label = action === RosterLog.SIGNUP ? 'Signed-Up' : 'Opted-Out';
    if (action === RosterLog.ADD_PLAYER) label = 'Players Added';
    if (action === RosterLog.REMOVE_PLAYER) label = 'Players Removed';
    if (action === RosterLog.CHANGE_GROUP) label = 'Group Changed';
    if (action === RosterLog.CHANGE_ROSTER) label = 'Roster Changed';

    const colorCodes: Record<RosterLog, number> = {
      [RosterLog.SIGNUP]: COLOR_CODES.GREEN,
      [RosterLog.OPT_OUT]: COLOR_CODES.RED,
      [RosterLog.ADD_PLAYER]: COLOR_CODES.DARK_GREEN,
      [RosterLog.REMOVE_PLAYER]: COLOR_CODES.DARK_RED,
      [RosterLog.CHANGE_GROUP]: COLOR_CODES.CYAN,
      [RosterLog.CHANGE_ROSTER]: COLOR_CODES.YELLOW
    };

    const embed = new EmbedBuilder().setColor(colorCodes[action]).setTitle(`${roster.name}`);
    if (roster.clan) {
      embed
        .setURL(`http://cprk.us/c/${roster.clan.tag.slice(1)}`)
        .setFooter({ text: `${roster.clan.name} (${roster.clan.tag})`, iconURL: roster.clan.badgeUrl });
    }

    embed.setDescription(
      [
        `### ${label}`,
        //
        members.map((mem) => `\u200e${mem.name} (${mem.tag}) ${mem.userId ? `<@${mem.userId}>` : ''}`).join('\n')
      ].join('\n')
    );
    if (action === RosterLog.CHANGE_GROUP) {
      embed.setDescription(
        [
          `### ${label}`,
          //
          members
            .map(
              (mem) =>
                `\u200e${mem.name} (${mem.tag}) ${mem.categoryId ? `- ${categoryMap[mem.categoryId.toHexString()]?.displayName || 'Ungrouped'}` : ''}`
            )
            .join('\n')
        ].join('\n')
      );
    }

    if (action !== RosterLog.OPT_OUT && action !== RosterLog.REMOVE_PLAYER) {
      embed.addFields({ name: 'User Group', value: categoryId ? categoryMap[categoryId]?.displayName : 'None' });
    }

    embed.addFields({ name: 'User', value: `<@${user.id}>` });

    const rosterLog =
      roster.logChannelId && roster.webhook
        ? { fromRoster: true, channelId: roster.logChannelId, webhook: { token: roster.webhook.token, id: roster.webhook.id } }
        : null;
    const defaultConfig = this.client.settings.get<{ fromRoster: boolean; channelId: string; webhook: { token: string; id: string } }>(
      roster.guildId,
      Settings.ROSTER_CHANGELOG,
      rosterLog
    );

    const config = rosterLog ?? defaultConfig;
    if (!config) return null;

    const webhook = new WebhookClient(config.webhook);
    const channel = this.client.util.getTextBasedChannel(config.channelId);

    try {
      return await webhook.send(channel?.isThread() ? { embeds: [embed], threadId: config.channelId } : { embeds: [embed] });
    } catch (error) {
      if ([DiscordErrorCodes.UNKNOWN_CHANNEL, DiscordErrorCodes.UNKNOWN_WEBHOOK].includes(error.code)) {
        if (config.fromRoster) {
          await this.edit(roster._id, { logChannelId: null, webhook: null });
        } else {
          await this.client.settings.delete(roster.guildId, Settings.ROSTER_CHANGELOG);
        }

        if (error.code === DiscordErrorCodes.UNKNOWN_WEBHOOK && !options.isRetry) {
          await this.retryWebhook(options, config);
          return null;
        }
      }

      captureException(error);
      this.client.logger.error(`${error.toString()}`, { label: 'RosterLog' });
    }
  }

  private async retryWebhook(options: RosterLogInput, config: RosterWebhookConfig) {
    const channel = this.client.util.getTextBasedChannel(config.channelId);
    if (!channel) return null;

    const { roster } = options;

    const webhook = await this.client.storage.getWebhook(channel.isThread() ? channel.parent! : channel);
    if (!webhook) return null;

    if (config.fromRoster) {
      await this.edit(roster._id, {
        logChannelId: channel.id,
        webhook: {
          token: webhook.token!,
          id: webhook.id
        }
      });
    } else {
      await this.client.settings.set(roster.guildId, Settings.ROSTER_CHANGELOG, {
        channelId: channel.id,
        webhook: { token: webhook.token, id: webhook.id }
      });
    }

    const updatedRoster = await this.get(roster._id);
    if (!updatedRoster) return null;

    await this.rosterChangeLog({ ...options, isRetry: true, roster: updatedRoster });
  }
}

interface RosterLogInput {
  roster: WithId<IRoster>;
  oldCategory?: IRosterCategory;
  oldRoster?: IRoster;
  user: User;
  action: RosterLog;
  members: IRosterMember[];
  categoryId?: string | null;
}

interface RosterWebhookConfig {
  fromRoster: boolean;
  channelId: string;
  webhook: {
    token: string;
    id: string;
  };
}

export enum RosterLog {
  SIGNUP = 'SIGNUP',
  OPT_OUT = 'OPT_OUT',
  ADD_PLAYER = 'ADD_PLAYER',
  REMOVE_PLAYER = 'REMOVE_PLAYER',
  CHANGE_GROUP = 'CHANGE_GROUP',
  CHANGE_ROSTER = 'CHANGE_ROSTER'
}

export function rosterLabel(roster: IRoster, hyperlink = false) {
  if (roster.clan && hyperlink) {
    return `${roster.name} ([${roster.clan.name}](http://cprk.us/c/${roster.clan.tag.replace('#', '')}))`;
  }
  if (roster.clan) {
    return `${roster.name} (${roster.clan.name})`;
  }
  return `${roster.name}`;
}

export function rosterClan(roster: IRoster) {
  if (roster.clan) {
    return `${roster.clan.name} (${roster.clan.tag})`;
  }
  return `All Clans (#00000)`;
}
