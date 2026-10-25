/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export enum BillingCadence {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum SubscriptionProvider {
  PATREON = 'patreon'
}

export enum TicketExtraButtonKind {
  LINK_ACCOUNT = 'link-account',
  URL = 'url'
}

export enum TicketDisplayMode {
  MENU = 'menu',
  BUTTONS = 'buttons'
}

/** Set for the link button only. */
export enum ButtonTokenField {
  REQUIRED = 'required',
  OPTIONAL = 'optional',
  HIDDEN = 'hidden'
}

export enum FlagType {
  BAN = 'ban',
  STRIKE = 'strike'
}

export enum NicknameAccount {
  DEFAULT = 'default-account',
  BEST = 'best-account',
  DEFAULT_OR_BEST = 'default-or-best-account'
}

export enum DelayExclusion {
  TOWN_HALL_ROLES = 'townHallRoles',
  BUILDER_HALL_ROLES = 'builderHallRoles',
  LEAGUE_ROLES = 'leagueRoles',
  BUILDER_LEAGUE_ROLES = 'builderLeagueRoles',
  GUEST_ROLE = 'guestRole'
}

export enum ClanEmbedField {
  ClanLeader = 'clanLeader',
  Requirements = 'requirements',
  TrophiesRequired = 'trophiesRequired',
  Location = 'location',
  WarPerformance = 'warPerformance',
  WarFrequency = 'warFrequency',
  ClanWarLeague = 'clanWarLeague',
  ClanCapitalLeague = 'clanCapitalLeague',
  TownHalls = 'townHalls'
}

export enum ChannelStatus {
  OK = 'ok',
  ARCHIVED = 'archived',
  LOCKED = 'locked',
  DELETED = 'deleted',
  NO_ACCESS = 'noAccess',
  UNKNOWN = 'unknown'
}

export enum ClanLogType {
  CLAN_ACHIEVEMENTS_LOG = 'clan_achievements_log',
  CONTINUOUS_DONATION_LOG = 'continuous_donation_log',
  DAILY_DONATION_LOG = 'daily_donation_log',
  WEEKLY_DONATION_LOG = 'weekly_donation_log',
  MONTHLY_DONATION_LOG = 'monthly_donation_log',
  CLAN_GAMES_EMBED_LOG = 'clan_games_embed_log',
  LAST_SEEN_EMBED_LOG = 'last_seen_embed_log',
  LEGEND_ATTACKS_DAILY_SUMMARY_LOG = 'legend_attacks_daily_summary_log',
  CLAN_CAPITAL_WEEKLY_SUMMARY_LOG = 'clan_capital_weekly_summary_log',
  CLAN_CAPITAL_CONTRIBUTION_LOG = 'clan_capital_contribution_log',
  CLAN_CAPITAL_RAID_LOG = 'clan_capital_raid_log',
  WAR_ATTACK_LOG = 'war_attack_log',
  CWL_ATTACK_LOG = 'cwl_attack_log',
  WAR_EMBED_LOG = 'war_embed_log',
  WAR_MISSED_ATTACKS_LOG = 'war_missed_attacks_log',
  CWL_EMBED_LOG = 'cwl_embed_log',
  CWL_MISSED_ATTACKS_LOG = 'cwl_missed_attacks_log',
  CWL_LINEUP_CHANGE_LOG = 'cwl_lineup_change_log',
  CWL_MONTHLY_SUMMARY_LOG = 'cwl_monthly_summary_log',
  MEMBER_JOIN_LEAVE_LOG = 'member_join_leave_log',
  ROLE_CHANGE_LOG = 'role_change_log',
  NAME_CHANGE_LOG = 'name_change_log',
  TOWN_HALL_UPGRADE_LOG = 'town_hall_upgrade_log',
  WAR_PREFERENCE_LOG = 'war_preference_log',
  RANKED_BATTLE_LEAGUE_CHANGE_LOG = 'ranked_battle_league_change_log'
}

export enum RaidAttacksLeft {
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6
}

export enum ReminderWarType {
  Normal = 'normal',
  Friendly = 'friendly',
  Cwl = 'cwl'
}

/** Ping members with this many attacks left; empty pings nobody. */
export enum WarAttacksLeft {
  One = 1,
  Two = 2
}

export enum ReminderClanRole {
  Leader = 'leader',
  CoLeader = 'coLeader',
  Admin = 'admin',
  Member = 'member'
}

export enum RosterSortBy {
  PLAYER_NAME = 'PLAYER_NAME',
  DISCORD_NAME = 'DISCORD_NAME',
  DISCORD_USERNAME = 'DISCORD_USERNAME',
  TOWN_HALL_LEVEL = 'TOWN_HALL_LEVEL',
  HERO_LEVEL = 'HERO_LEVEL',
  TH_HERO_LEVEL = 'TH_HERO_LEVEL',
  CLAN_NAME = 'CLAN_NAME',
  SIGNUP_TIME = 'SIGNUP_TIME',
  TROPHIES = 'TROPHIES',
  LEAGUES = 'LEAGUES'
}

export enum RosterCategory {
  GENERAL = 'GENERAL',
  CWL = 'CWL',
  WAR = 'WAR',
  TROPHY = 'TROPHY'
}

export enum WarTypes {
  REGULAR = 1,
  FRIENDLY = 2,
  CWL = 3
}

/** Only these event types; all of them when omitted. */
export enum ClanActivityType {
  TownHallUpgrade = 'town_hall_upgrade',
  Joined = 'joined',
  Left = 'left',
  ClanLevelUp = 'clan_level_up',
  CapitalHallLevelUp = 'capital_hall_level_up',
  WarLeagueChange = 'war_league_change',
  CapitalLeagueChange = 'capital_league_change'
}

export enum UserRoles {
  USER = 'user',
  ADMIN = 'admin',
  VIEWER = 'viewer',
  FETCH_WARS = 'fetch:wars',
  FETCH_CLANS = 'fetch:clans',
  FETCH_PLAYERS = 'fetch:players',
  FETCH_LEGENDS = 'fetch:legends',
  FETCH_LINKS = 'fetch:links',
  MANAGE_LINKS = 'manage:links',
  FETCH_ROSTERS = 'fetch:rosters',
  MANAGE_ROSTERS = 'manage:rosters',
  MANAGE_REMINDERS = 'manage:reminders'
}

export enum ErrorCodes {
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  HANDOFF_TOKEN_EXPIRED = 'HANDOFF_TOKEN_EXPIRED',
  USER_BLOCKED = 'USER_BLOCKED',
  INVALID_PASSKEY = 'INVALID_PASSKEY',
  GUILD_ACCESS_FORBIDDEN = 'GUILD_ACCESS_FORBIDDEN',
  BOT_NOT_IN_GUILD = 'BOT_NOT_IN_GUILD'
}

export interface ErrorResponseDto {
  /** @example "string" */
  code: ErrorCodes;
  message: string;
  statusCode: number;
  method: string;
  path: string;
}

export interface JwtUserInput {
  roles: string[];
  jti: string;
  userId: string;
  username: string;
  version: string;
  guildIds: string[];
  applicationId?: string;
  remoteIp?: string;
  cacheMultiplier?: number;
}

export interface LoginInputDto {
  passKey: string;
}

export interface LoginOkDto {
  roles: UserRoles[];
  userId: string;
  accessToken: string;
}

export interface GenerateTokenInputDto {
  /** @default ["user","admin","viewer","fetch:wars","fetch:clans","fetch:players","fetch:legends","fetch:links","manage:links","fetch:rosters","manage:rosters","manage:reminders"] */
  roles: UserRoles[];
  userId: string;
}

export interface GenerateTokenDto {
  roles: UserRoles[];
  userId: string;
  accessToken: string;
  passKey: string;
  isBot: boolean;
  displayName: string;
}

export interface AuthUserDto {
  roles: UserRoles[];
  userId: string;
  displayName: string;
  isBot: boolean;
}

export interface HandoffGuildDto {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface HandoffUserDto {
  roles: UserRoles[];
  userId: string;
  displayName: string;
  username: string;
  isBot: boolean;
  /** Null when the user can't manage the server, so the dashboard opens without one. */
  guild: HandoffGuildDto | null;
  applicationId: string | null;
  avatarUrl: string | null;
}

export interface HandoffTokenInputDto {
  userId: string;
  guildId: string;
  applicationId: string | null;
}

export interface HandoffTokenDto {
  token: string;
}

export interface BotGuildsInputDto {
  /**
   * @maxItems 200
   * @minItems 1
   */
  guildIds: string[];
}

export interface BotGuildDto {
  id: string;
  name: string;
  iconUrl: string | null;
  clanCount: number;
}

export interface BotGuildsDto {
  guilds: BotGuildDto[];
}

export interface ManagedGuildsInputDto {
  /**
   * @maxItems 200
   * @minItems 1
   */
  guildIds: string[];
  /** @pattern ^\d{17,20}$ */
  userId: string;
}

export interface ManagedGuildsDto {
  /** Servers where the user holds one of the bot manager roles. */
  guildIds: string[];
}

export interface GuildAccessInputDto {
  /** @pattern ^\d{17,20}$ */
  userId: string;
  /** @pattern ^\d{17,20}$ */
  guildId: string;
  /**
   * The custom bot the session came from, if any.
   * @pattern ^\d{17,20}$
   */
  applicationId?: string | null;
}

export interface GuildAccessDto {
  /** False when the bot was never added to the server or has been removed. */
  hasBot: boolean;
  /** Owner, Administrator, Manage Server or the bot manager role. */
  canManage: boolean;
}

export interface CreateLinkInputDto {
  playerTag: string;
  userId: string;
  apiToken: string | null;
}

export interface ResultOkDto {
  message: string;
}

export interface GetLinksInputDto {
  /**
   * @maxItems 100
   * @minItems 1
   * @example ["#2PP"]
   */
  playerTags?: string[];
  /**
   * @maxItems 100
   * @minItems 1
   * @example ["444432489818357760"]
   */
  userIds?: string[];
}

export interface LinksDto {
  tag: string;
  name: string;
  userId: string;
  username: string;
  verified: boolean;
}

export interface ClanActivityInputDto {
  /**
   * @maxItems 10
   * @minItems 1
   * @example ["#2L2YLJV2C"]
   */
  clanTags: string[];
  /**
   * @min 1
   * @max 30
   * @default 7
   */
  days?: number;
  /**
   * @min 1
   * @max 100
   * @default 50
   */
  limit?: number;
  /**
   * Only these event types; all of them when omitted.
   * @minItems 1
   * @default ["town_hall_upgrade","joined","left","clan_level_up","capital_hall_level_up","war_league_change","capital_league_change"]
   */
  types?: ClanActivityType[];
}

export interface ClanActivityPlayerDto {
  tag: string;
  name: string;
}

export interface ClanActivityClanDto {
  tag: string;
  name: string;
}

export interface ClanActivityItemDto {
  type: ClanActivityType;
  /** Who it happened to; null for clan-wide events. */
  player: ClanActivityPlayerDto | null;
  /** The new Town Hall, clan or Capital Hall level; null otherwise. */
  level: number | null;
  /** The new war or capital league; null otherwise. */
  league: string | null;
  /** @format date-time */
  createdAt: string;
  clan: ClanActivityClanDto;
}

export interface ClanActivityDto {
  /** Newest first. */
  items: ClanActivityItemDto[];
}

export interface LocationDto {
  localizedName?: string;
  id: number;
  name: string;
  isCountry: boolean;
  countryCode?: string;
}

export interface ChatLanguageDto {
  name: string;
  id: number;
  languageCode: string;
}

export interface ClanBadge {
  large: string;
  small: string;
  medium: string;
}

export interface NamedLeagueDto {
  id: number;
  name: string;
}

export interface IconUrlsDto {
  small: string;
  tiny?: string;
  medium?: string;
}

export interface LabelDto {
  id: number;
  name: string;
  iconUrls: IconUrlsDto;
}

export interface LeagueTierIconUrlsDto {
  small: string;
  large: string;
}

export interface LeagueTierDto {
  id: number;
  name: string;
  iconUrls: LeagueTierIconUrlsDto;
}

export interface PlayerHouseElementDto {
  type: string;
  id: number;
}

export interface PlayerHouseDto {
  elements: PlayerHouseElementDto[];
}

export interface ClanMemberDto {
  role: 'member' | 'admin' | 'coLeader' | 'leader';
  name: string;
  tag: string;
  expLevel: number;
  townHallLevel: number;
  leagueTier: LeagueTierDto;
  builderBaseLeague?: NamedLeagueDto;
  trophies: number;
  builderBaseTrophies?: number;
  clanRank: number;
  previousClanRank: number;
  donations: number;
  donationsReceived: number;
  playerHouse?: PlayerHouseDto;
}

export interface ClanCapitalDistrictDto {
  id: number;
  name: string;
  districtHallLevel: number;
}

export interface ClanCapitalDto {
  capitalHallLevel?: number;
  districts?: ClanCapitalDistrictDto[];
}

export interface ClanDto {
  type: 'open' | 'inviteOnly' | 'closed';
  warFrequency?:
    'always' | 'moreThanOncePerWeek' | 'oncePerWeek' | 'lessThanOncePerWeek' | 'never' | 'unknown';
  tag: string;
  name: string;
  description: string;
  location?: LocationDto;
  chatLanguage?: ChatLanguageDto;
  badgeUrls: ClanBadge;
  clanLevel: number;
  clanPoints: number;
  clanBuilderBasePoints: number;
  requiredTrophies: number;
  requiredTownhallLevel?: number;
  requiredBuilderBaseTrophies?: number;
  warWinStreak: number;
  warWins: number;
  warTies?: number;
  warLosses?: number;
  isWarLogPublic: boolean;
  warLeague?: NamedLeagueDto;
  members: number;
  labels: LabelDto[];
  memberList: ClanMemberDto[];
  clanCapital: ClanCapitalDto;
  isFamilyFriendly: boolean;
  clanCapitalPoints: number;
  capitalLeague?: NamedLeagueDto;
}

export interface LastSeenMemberClan {
  name: string;
  tag: string;
}

export interface LastSeenMemberDto {
  clan?: LastSeenMemberClan;
  name: string;
  tag: string;
  /** @format date-time */
  lastSeen: string;
  leagueId: number;
  townHallLevel: number;
  scores: {
    last24h: number;
    last30d: number;
  };
}

export interface LastSeenDto {
  items: LastSeenMemberDto[];
}

export interface CapitalContributionClanDto {
  name: string;
  tag: string;
}

export interface CapitalContributionItemDto {
  name: string;
  tag: string;
  season: string;
  initial: number;
  current: number;
  clan: CapitalContributionClanDto;
  /** @format date-time */
  createdAt: string;
}

export interface CapitalContributionDto {
  items: CapitalContributionItemDto[];
}

export interface CapitalRaidMemberDto {
  name: string;
  tag: string;
  attacks: number;
  attackLimit: number;
  bonusAttackLimit: number;
  capitalResourcesLooted: number;
}

export interface CapitalRaidSeasonDto {
  name: string;
  tag: string;
  state: string;
  members: CapitalRaidMemberDto[];
  /** @format date-time */
  startDate: string;
  /** @format date-time */
  endDate: string;
  offensiveReward: number;
  defensiveReward: number;
  capitalTotalLoot: number;
  totalAttacks: number;
  enemyDistrictsDestroyed: number;
  raidsCompleted: number;
}

export interface CapitalRaidsDto {
  items: CapitalRaidSeasonDto[];
}

export interface ClanGamesMemberDto {
  /** @format date-time */
  completedAt: string | null;
  name: string;
  tag: string;
  points: number;
}

export interface ClanGamesDto {
  season: string;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  /** Most points one member can earn. */
  maxPoints: number;
  /** Sum of each member's points, capped at `maxPoints`. */
  totalPoints: number;
  members: ClanGamesMemberDto[];
}

export interface ClanLinkedMemberDto {
  userId?: string | null;
  username?: string | null;
  displayName?: string | null;
  name: string;
  tag: string;
  role: string;
  townHallLevel: number;
  verified: boolean;
  deletable: boolean;
}

export interface ClanLinksDto {
  name: string;
  tag: string;
  members: number;
  memberList: ClanLinkedMemberDto[];
}

export interface PlayerClanDto {
  tag: string;
  name: string;
  clanLevel: number;
  badgeUrls: ClanBadge;
}

export interface PlayerSeasonDto {
  id: string;
  rank: number;
  trophies: number;
}

export interface PlayerCurrentSeasonDto {
  id?: string;
  rank?: number;
  trophies: number;
}

export interface LegendStatisticsDto {
  previousSeason?: PlayerSeasonDto;
  previousBuilderBaseSeason?: PlayerSeasonDto;
  bestBuilderBaseSeason?: PlayerSeasonDto;
  currentSeason?: PlayerCurrentSeasonDto;
  bestSeason?: PlayerSeasonDto;
  legendTrophies: number;
}

export interface PlayerAchievementDto {
  completionInfo: string | null;
  village: 'home' | 'builderBase';
  name: string;
  stars: number;
  value: number;
  target: number;
  info: string;
}

export interface PlayerItemDto {
  equipment?: PlayerItemDto[];
  village: 'home' | 'builderBase';
  name: string;
  level: number;
  maxLevel: number;
  superTroopIsActive?: boolean;
}

export interface PlayerDto {
  warPreference?: 'in' | 'out';
  name: string;
  tag: string;
  townHallLevel: number;
  townHallWeaponLevel?: number;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  warStars: number;
  attackWins: number;
  defenseWins: number;
  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;
  donations: number;
  donationsReceived: number;
  clanCapitalContributions: number;
  role?: string;
  clan?: PlayerClanDto;
  leagueTier: LeagueTierDto;
  builderBaseLeague?: NamedLeagueDto;
  currentLeagueGroupTag: string;
  currentLeagueSeasonId: number;
  previousLeagueGroupTag: string;
  previousLeagueSeasonId: number;
  legendStatistics?: LegendStatisticsDto;
  achievements: PlayerAchievementDto[];
  troops: PlayerItemDto[];
  heroes: PlayerItemDto[];
  spells: PlayerItemDto[];
  heroEquipment: PlayerItemDto[];
  labels: LabelDto[];
  playerHouse?: PlayerHouseDto;
}

export interface PlayerSeasonClanStatsDto {
  tag: string;
  name: string;
  donations: number;
  donationsReceived: number;
}

export interface PlayerSeasonStatsDto {
  /** The league season's start date, `YYYY-MM-DD`. */
  season: string;
  townHallLevel: number;
  trophies: number;
  attackWins: number;
  defenseWins: number;
  donations: number;
  donationsReceived: number;
  warStars: number;
  cwlStars: number;
  capitalGold: number;
  clanGamesPoints: number;
  goldLoot: number;
  elixirLoot: number;
  darkElixirLoot: number;
  clans: PlayerSeasonClanStatsDto[];
}

export interface PlayerSeasonStatsItemsDto {
  items: PlayerSeasonStatsDto[];
}

export interface RankedLeagueDto {
  id: number;
  name: string;
  iconUrl: string | null;
}

export interface RankedClanDto {
  tag: string;
  name: string;
}

export interface RankedGroupMemberDto {
  /** Null when the player isn't in a clan. */
  clan: RankedClanDto | null;
  rank: number;
  tag: string;
  name: string;
  trophies: number;
  attackWins: number;
  attackLosses: number;
  defenseWins: number;
  defenseLosses: number;
}

export interface RankedOpponentDto {
  tag: string;
  name: string;
}

export interface RankedBattleDto {
  opponent: RankedOpponentDto;
  stars: number;
  destruction: number;
  /** Trophies this battle gave the attacker. */
  trophies: number;
  /** @format date-time */
  createdAt: string;
}

export interface RankedWeekDto {
  /** Attacks allowed this week, and the most defenses taken; null when the game data is unavailable. */
  maxBattles: number | null;
  league: RankedLeagueDto;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  rank: number;
  /** Players in the group. */
  total: number;
  /** The top this many move up a league at the end of the week; 0 when nobody does. */
  promotionZone: number;
  /** The bottom this many move down; 0 when nobody does. */
  demotionZone: number;
  trophies: number;
  /** Standings, best first. */
  members: RankedGroupMemberDto[];
  /** The player's own attacks and defenses, newest first. */
  attacks: RankedBattleDto[];
  defenses: RankedBattleDto[];
  attackWins: number;
  attackLosses: number;
  defenseWins: number;
  defenseLosses: number;
}

export interface RankedHistoryItemDto {
  league: RankedLeagueDto;
  /** @format date-time */
  startTime: string;
  placement: number;
  trophies: number;
  defenseStars: number;
  maxBattles: number;
  attackWins: number;
  attackLosses: number;
  defenseWins: number;
  defenseLosses: number;
}

export interface RankedDto {
  /** This week's group; null when the player isn't in one (between weeks, or unranked). */
  current: RankedWeekDto | null;
  /** Past weeks, newest first. */
  history: RankedHistoryItemDto[];
}

export interface BattleLogDto {
  name: string;
  tag: string;
  opponentTag: string;
  battleType: string;
  isAttack: boolean;
  stars: number;
  destruction: number;
  trophies: number;
  /** @default 0 */
  startTrophies: number;
  /** @default 0 */
  endTrophies: number;
  trophyChange: number;
  battleDate: string;
  battleSeason: string;
  battleWeek: string;
  leagueId: number;
  /** @format date-time */
  ingestedAt: string;
}

export interface BattleLogItemsDto {
  items: BattleLogDto[];
}

export interface BattleLogDailyDto {
  name: string;
  tag: string;
  battleDate: string;
  trophies: number;
  offenseTrophies: number;
  defenseTrophies: number;
  gain: number;
  attackCount: number;
  defenseCount: number;
}

export interface BattleLogAggregateItemsDto {
  items: BattleLogDailyDto[];
}

export interface BattleLogLeaderboardInputDto {
  /**
   * The league season's start date. A legacy `YYYY-MM` season id is still accepted.
   * @pattern ^\d{4}-\d{2}(-\d{2})?$
   * @example "2026-10-05"
   */
  seasonId: string;
  playerTags: string[];
}

export interface BattleLogLeaderboardItemDto {
  tag: string;
  name: string;
  trophies: number;
}

export interface BattleLogLeaderboardDto {
  items: BattleLogLeaderboardItemDto[];
}

export interface GlobalClanEntity {
  tag: string;
  name: string;
}

export interface GlobalClanHistoryEntity {
  clan: GlobalClanEntity;
  playerTag: string;
  /** @format date-time */
  firstSeen: string;
  /** @format date-time */
  lastSeen: string;
}

export interface ClanHistoryItemsDto {
  items: GlobalClanHistoryEntity[];
}

export interface AttackRecordDto {
  defender: {
    tag: string;
    townHallLevel: number;
    mapPosition: number;
  };
  stars: number;
  trueStars: number;
  defenderTag: string;
  destruction: number;
}

export interface AttackHistoryDto {
  warType: WarTypes;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  attacks: AttackRecordDto[];
  season: string;
  id: number;
  clan: {
    name: string;
    tag: string;
  };
  opponent: {
    name: string;
    tag: string;
  };
  attacker: {
    name: string;
    tag: string;
    townHallLevel: number;
    mapPosition: number;
  };
  attacksPerMember: number;
  teamSize: number;
}

export interface AttackHistoryItemsDto {
  items: AttackHistoryDto[];
}

export interface AggregateAttackHistoryDto {
  season: string;
  totalWars: number;
  totalAttacks: number;
  total3Stars: number;
  totalMissed: number;
  totalStars: number;
}

export interface AggregateAttackHistoryItemsDto {
  items: AggregateAttackHistoryDto[];
}

export interface AggregateClanWarLeagueHistoryDto {
  clan: {
    tag: string;
    name: string;
  };
  /** The clan's war league in that group; null when the group wasn't stored. */
  leagueId: number | null;
  season: string;
  /** Rounds the player was in the lineup for. */
  wars: number;
  attacks: number;
  /** Attacks left unused in ended rounds. */
  missed: number;
  stars: number;
  threeStars: number;
  /** Sum over attacks; divide by `attacks` for the average. */
  destruction: number;
}

export interface AggregateClanWarLeagueHistoryItemsDto {
  items: AggregateClanWarLeagueHistoryDto[];
}

export interface ThresholdsDto {
  rank: number;
  minTrophies: number;
}

export interface LegendRankingThresholdsSnapShotDto {
  timestamp: string;
  thresholds: ThresholdsDto[];
}

export interface LegendRankingThresholdsDto {
  live: LegendRankingThresholdsSnapShotDto;
  eod: LegendRankingThresholdsSnapShotDto | null;
  history: LegendRankingThresholdsSnapShotDto[];
}

export interface GetLegendAttacksInputDto {
  /**
   * @maxItems 100
   * @minItems 1
   * @example ["#2PP"]
   */
  playerTags: string[];
}

export interface LegendAttackLogDto {
  timestamp: number;
  start: number;
  end: number;
  diff: number;
  type: string;
}

export interface LegendAttacksDto {
  tag: string;
  name: string;
  seasonId: string;
  trophies: number;
  logs: LegendAttackLogDto[];
}

export interface LegendAttacksItemsDto {
  items: LegendAttacksDto[];
}

export interface LegendSeasonDto {
  seasonId: string;
  /** Trophies when the season's first attack or defense was tracked. */
  initial: number;
  /** Trophies after the season's last tracked attack or defense. */
  trophies: number;
  /**
   * Trophies gained from attacks. Several attacks between two checks land as one log entry, so
   * attacks are only totalled, not counted.
   */
  attackTrophies: number;
  /** Trophies lost to defenses, as a negative number. */
  defenseTrophies: number;
}

export interface LegendSeasonsDto {
  /** Newest first, at most 6. */
  items: LegendSeasonDto[];
}

export interface LegendRankDto {
  tag: string;
  name: string;
  rank: number;
  trophies: number;
}

export interface ClanWarLeagueRound {
  warTags: string[];
}

export interface LeagueGroupClanDto {
  tag: string;
  name: string;
  leagueId: number;
}

export interface ClanWarAttackDto {
  attackerTag: string;
  defenderTag: string;
  stars: number;
  destructionPercentage: number;
  order: number;
  duration: number;
}

export interface ClanWarMemberDto {
  attacks?: ClanWarAttackDto[];
  bestOpponentAttack?: ClanWarAttackDto;
  mapPosition: number;
  name: string;
  opponentAttacks: number;
  tag: string;
  townhallLevel: number;
}

export interface WarClanDto {
  tag: string;
  name: string;
  badgeUrls: ClanBadge;
  clanLevel: number;
  attacks: number;
  stars: number;
  destructionPercentage: number;
  members: ClanWarMemberDto[];
}

export interface ClanWarDto {
  state: 'notInWar' | 'preparation' | 'inWar' | 'warEnded';
  startTime: string;
  preparationStartTime: string;
  endTime: string;
  battleModifier?: 'none' | 'hardMode';
  attacksPerMember?: number | null;
  round?: number | null;
  warTag?: string | null;
  teamSize: number;
  clan: WarClanDto;
  opponent: WarClanDto;
  result: string;
}

export interface ClanWarLeaguesDto {
  season: string;
  rounds: ClanWarLeagueRound[];
  clans: LeagueGroupClanDto[];
  wars: ClanWarDto[];
}

export interface ClanWarSideDto {
  tag: string;
  name: string;
  badgeUrls: ClanBadge;
  clanLevel: number;
  attacks: number;
  stars: number;
  destructionPercentage: number;
}

export interface ClanWarLeagueRoundDto {
  /** Position in the group's schedule; null when the group wasn't stored. */
  round: number | null;
  state: 'preparation' | 'inWar' | 'warEnded';
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  result: 'win' | 'lose' | 'tie';
  id: number;
  teamSize: number;
  clan: ClanWarSideDto;
  opponent: ClanWarSideDto;
}

export interface ClanWarMemberTotalsDto {
  tag: string;
  name: string;
  /** From the member's latest war in the set. */
  townHallLevel: number;
  /** Wars the member was in the lineup for. */
  wars: number;
  attacks: number;
  stars: number;
  threeStars: number;
  /** Sum over attacks; divide by `attacks` for the average. */
  destruction: number;
  /** Attacks left unused in ended wars. */
  missed: number;
  /** Attacks on a base of the same or a higher Town Hall. */
  sameThAttacks: number;
  sameThThreeStars: number;
}

export interface ClanWarLeagueSeasonDto {
  /** The stored group (for standings); null when it wasn't stored. */
  groupId: number | null;
  /** The game's season id for the group, e.g. "2026-10-02"; null when the group wasn't stored. */
  groupSeason: string | null;
  /** The clan's war league that season; null when the group wasn't stored. */
  leagueId: number | null;
  /** Clans in the group; null when the group wasn't stored. */
  groupSize: number | null;
  season: string;
  rounds: ClanWarLeagueRoundDto[];
  /** Most stars first. */
  members: ClanWarMemberTotalsDto[];
}

export interface ClanWarLeagueSeasonsDto {
  /** Newest season first. */
  items: ClanWarLeagueSeasonDto[];
}

export interface ClanWarStatsDto {
  /** Ended wars counted; fewer than asked when the clan has fewer stored. */
  wars: number;
  /** CWL seasons among those wars, newest first. */
  seasons: string[];
  members: ClanWarMemberTotalsDto[];
}

export interface ClanWarLeagueStandingDto {
  badgeUrls: ClanBadge | null;
  tag: string;
  name: string;
  /** Stars plus 10 per war won, as the game ranks them. */
  stars: number;
  /** Total destruction over all wars: each war's percentage times its size. */
  destruction: number;
  wins: number;
  /** League at the start of the season. */
  leagueId: number;
}

export interface ClanWarLeagueStandingsDto {
  groupId: number;
  season: string;
  /** Rounds with at least one war started. */
  roundsPlayed: number;
  totalRounds: number;
  /** False when some wars no longer load from the game, so the table is partial. */
  complete: boolean;
  /** Best first. */
  rows: ClanWarLeagueStandingDto[];
}

export interface ClanWarSummaryDto {
  warType: WarTypes;
  state: 'preparation' | 'inWar' | 'warEnded';
  /** @format date-time */
  preparationStartTime: string;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  /** Set for CWL rounds only. */
  warTag: string | null;
  /** From the requested clan's side; "tie" while a war is still running and level. */
  result: 'win' | 'lose' | 'tie';
  id: number;
  teamSize: number;
  attacksPerMember: number;
  clan: ClanWarSideDto;
  opponent: ClanWarSideDto;
}

export interface ClanWarListDto {
  /** Pass as `before` for the next page; null on the last page. */
  next: number | null;
  items: ClanWarSummaryDto[];
}

export interface CurrentWarDto {
  /** The regular war, or the CWL round in war (else in preparation, else the last ended one). */
  war: ClanWarDto | null;
  /** False when the war log is private: regular wars are hidden then, CWL wars are not. */
  isWarLogPublic: boolean;
}

export interface GameEventDto {
  type: 'season' | 'raid_weekend' | 'clan_games' | 'cwl';
  state: 'ended' | 'active' | 'upcoming';
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  /**
   * CWL only: when signup closes.
   * @format date-time
   */
  signupEndTime?: string;
}

export interface GameEventsDto {
  /** Every occurrence overlapping the range, by start time. */
  items: GameEventDto[];
}

export interface UpcomingEventsDto {
  /** Running or next occurrence of each event, soonest change first. */
  items: GameEventDto[];
}

export interface RosterMemberOfRostersEntity {
  warPreference: 'in' | 'out';
  categoryId?: string | null;
  name: string;
  tag: string;
  userId: string | null;
  username: string | null;
  displayName?: string | null;
  role: string | null;
  townHallLevel: number;
  heroes: Record<string, number>;
  trophies: number;
  leagueId?: number;
  clan?: {
    tag: string;
    name: string;
    alias?: string | null;
  };
  /** @format date-time */
  createdAt: string;
}

export interface RostersEntity {
  _id: string;
  category: 'GENERAL' | 'CWL' | 'WAR' | 'TROPHY' | 'NO_CLAN';
  name: string;
  guildId: string;
  maxMembers?: number;
  minTownHall?: number;
  maxTownHall?: number;
  minHeroLevels?: number;
  roleId?: string | null;
  colorCode?: number;
  clan: {
    tag: string;
    name: string;
    badgeUrl: string;
    league: {
      id?: number;
      name?: string;
    };
  };
  members: RosterMemberOfRostersEntity[];
  layout?: string;
  sheetId?: string;
  closed: boolean;
  /** @format date-time */
  startTime?: string | null;
  /** @format date-time */
  endTime?: string | null;
  sortBy?: string;
  useClanAlias?: boolean;
  allowUnlinked?: boolean;
  allowMultiSignup?: boolean;
  maxAccountsPerUser?: number | null;
  rosterImage?: string | null;
  allowCategorySelection?: boolean;
  requireCategorySelection?: boolean;
  categorySelectionCustomText?: string | null;
  logChannelId?: string | null;
  /** @format date-time */
  lastUpdated: string;
  /** @format date-time */
  createdAt: string;
}

export interface RosterGroupsEntity {
  _id: string;
  displayName: string;
  name: string;
  guildId: string;
  order: number;
  selectable: boolean;
  roleId?: string | null;
  /** @format date-time */
  createdAt: string;
}

export interface GetRostersDto {
  rosters: RostersEntity[];
  categories: RosterGroupsEntity[];
}

export interface RosterInput {
  category?: RosterCategory;
  sortBy?: RosterSortBy;
  /**
   * @minLength 1
   * @maxLength 30
   */
  name: string;
  /** Leave out for a roster open to all clans. */
  clanTag?: string | null;
  /** Sign up the clan's current members when the roster is created. */
  importMembers?: boolean;
  allowUnlinked?: boolean;
  allowMultiSignup?: boolean;
  allowCategorySelection?: boolean;
  requireCategorySelection?: boolean;
  /**
   * @minLength 1
   * @maxLength 100
   */
  categorySelectionCustomText?: string | null;
  /**
   * @min 5
   * @max 500
   */
  maxMembers?: number;
  /**
   * @min 1
   * @max 75
   */
  maxAccountsPerUser?: number | null;
  /**
   * @min 2
   * @max 18
   */
  minTownHall?: number | null;
  /**
   * @min 2
   * @max 18
   */
  maxTownHall?: number | null;
  /** @min 0 */
  minHeroLevels?: number | null;
  /** @pattern ^\d{17,20}$ */
  roleId?: string | null;
  /** 3 to 5 column keys joined by "/", e.g. "#/TH_ICON/DISCORD/NAME/CLAN". */
  layout?: string;
  useClanAlias?: boolean;
  /**
   * @min 0
   * @max 16777215
   */
  colorCode?: number | null;
  /** @format uri */
  rosterImage?: string | null;
  /** ISO time; null opens sign-ups right away. */
  startTime?: string | null;
  /** ISO time; null keeps sign-ups open until closed by hand. */
  endTime?: string | null;
}

export interface RosterGroupInput {
  /**
   * @minLength 1
   * @maxLength 30
   */
  name: string;
  /** @pattern ^\d{17,20}$ */
  roleId?: string | null;
  /** Players can pick it when they sign up. */
  selectable?: boolean;
}

export interface RosterGroupUpdateInput {
  /**
   * @minLength 1
   * @maxLength 30
   */
  name?: string;
  /** @pattern ^\d{17,20}$ */
  roleId?: string | null;
  /** Players can pick it when they sign up. */
  selectable?: boolean;
  /**
   * @min 1
   * @max 1000
   */
  order?: number;
}

export interface RosterUpdateInput {
  category?: RosterCategory;
  sortBy?: RosterSortBy;
  /**
   * @minLength 1
   * @maxLength 30
   */
  name?: string;
  /** Leave out for a roster open to all clans. */
  clanTag?: string | null;
  /** Sign up the clan's current members when the roster is created. */
  importMembers?: boolean;
  allowUnlinked?: boolean;
  allowMultiSignup?: boolean;
  allowCategorySelection?: boolean;
  requireCategorySelection?: boolean;
  /**
   * @minLength 1
   * @maxLength 100
   */
  categorySelectionCustomText?: string | null;
  /**
   * @min 5
   * @max 500
   */
  maxMembers?: number;
  /**
   * @min 1
   * @max 75
   */
  maxAccountsPerUser?: number | null;
  /**
   * @min 2
   * @max 18
   */
  minTownHall?: number | null;
  /**
   * @min 2
   * @max 18
   */
  maxTownHall?: number | null;
  /** @min 0 */
  minHeroLevels?: number | null;
  /** @pattern ^\d{17,20}$ */
  roleId?: string | null;
  /** 3 to 5 column keys joined by "/", e.g. "#/TH_ICON/DISCORD/NAME/CLAN". */
  layout?: string;
  useClanAlias?: boolean;
  /**
   * @min 0
   * @max 16777215
   */
  colorCode?: number | null;
  /** @format uri */
  rosterImage?: string | null;
  /** ISO time; null opens sign-ups right away. */
  startTime?: string | null;
  /** ISO time; null keeps sign-ups open until closed by hand. */
  endTime?: string | null;
  closed?: boolean;
}

export interface CloneRosterInput {
  /**
   * Defaults to "<name> [CLONE]".
   * @minLength 1
   * @maxLength 30
   */
  name?: string;
}

export interface RosterTagsInput {
  /**
   * @maxItems 100
   * @minItems 1
   */
  playerTags: string[];
}

export interface RosterCheckUserDto {
  id: string;
  username: string;
  displayName: string;
}

export interface RosterPlayerCheckDto {
  tag: string;
  /** Null when no player has this tag. */
  name: string | null;
  townHallLevel: number | null;
  heroLevels: number | null;
  clanRole: string | null;
  /** The linked Discord member, if any. */
  user: RosterCheckUserDto | null;
  canJoin: boolean;
  /** Why the player can't join, in the bot's words. */
  reason: string | null;
}

export interface AddRosterMembersInput {
  /**
   * @maxItems 100
   * @minItems 1
   */
  playerTags: string[];
  groupId?: string | null;
}

export interface AddRosterMembersDto {
  roster: RostersEntity;
  result: RosterPlayerCheckDto[];
}

export interface RemoveMembersBulkInput {
  /** @minItems 1 */
  playerTags: string[];
}

export interface TransferRosterMembersInput {
  /** Required unless newGroupId is set. */
  newRosterId?: string;
  /** Required unless newRosterId is set. */
  newGroupId?: string;
  /** @minItems 1 */
  playerTags: string[];
}

export interface TransferRosterMembersDto {
  roster: RostersEntity;
  result: {
    player: {
      name?: string;
      tag?: string;
    };
    success: boolean;
    message: string;
  }[];
}

export interface ClanRefDto {
  tag: string;
  name: string | null;
}

export interface TimezoneDto {
  id: string;
  name: string;
  location: string;
}

export interface UserSettingsDto {
  /** Used by bot commands run without a clan tag. */
  clan: ClanRefDto | null;
  /** Clans the user bookmarked on the dashboard, on every device. */
  bookmarks: ClanRefDto[];
  /** Used by /activity charts; null means UTC. */
  timezone: TimezoneDto | null;
}

export interface ClanTagInput {
  /** @pattern ^#?[0-9A-Za-z]{3,12}$ */
  clanTag: string;
}

export interface TimezoneInput {
  /**
   * IANA ID, e.g. `Asia/Kolkata`.
   * @minLength 1
   * @maxLength 64
   */
  id: string;
}

export interface GuildClanDto {
  _id: string;
  categoryId: string;
  name: string;
  tag: string;
  order: number;
  league: string;
  level: number;
  members: number;
  /** Finds the clan in commands; `{ALIAS}` in nicknames. */
  alias: string | null;
  /** Shown instead of the clan name in reminders and lists. */
  nickname: string | null;
  /** Commands run in these channels use this clan when no tag is given. */
  channels: string[];
}

export interface CategoryDto {
  _id: string;
  displayName: string;
  order: number;
  clans: GuildClanDto[];
}

export interface GuildClansDto {
  guildId: string;
  name: string;
  categories: CategoryDto[];
}

export interface ReorderClansInput {
  _id: string;
  order: number;
}

export interface ReorderCategoriesInput {
  _id: string;
  order: number;
  clans: ReorderClansInput[];
}

export interface ReorderClanCategoriesInput {
  /** @minItems 1 */
  categories: ReorderCategoriesInput[];
}

export interface AddGuildClanInput {
  /**
   * With or without `#`; the letter O is read as zero, as in the game.
   * @pattern ^#?[0-9A-Za-z]{3,15}$
   */
  tag: string;
  categoryId?: string | null;
}

export interface ClanSettingsInput {
  /**
   * Up to 15 characters, no spaces or leading #.
   * @pattern ^[^#\s]\S{0,14}$
   */
  alias?: string | null;
  /**
   * @minLength 1
   * @maxLength 15
   */
  nickname?: string | null;
  /** @maxItems 25 */
  channels?: string[];
}

export interface ClanCategoryInput {
  /**
   * @minLength 1
   * @maxLength 36
   */
  name: string;
}

export interface ReminderClanDto {
  tag: string;
  name: string;
}

export interface ReminderScheduleDto {
  warType: 'normal' | 'friendly' | 'cwl';
  id: string;
  clan: ReminderClanDto;
  /**
   * When the bot pings (or pinged) for this clan.
   * @format date-time
   */
  timestamp: string;
  triggered: boolean;
  /** Bot outcome once handled, e.g. `reminder_sent_successfully` or a skip reason. */
  reason: string | null;
}

export interface ClanWarReminderDto {
  disabled: boolean;
  townHalls: number[];
  remaining: number[];
  warTypes: string[];
  smartSkip: boolean;
  silent: boolean;
  randomLimit: number | null;
  id: string;
  /** Short ID the bot shows in Discord: the last 5 hex characters, uppercased. */
  shortId: string;
  channelId: string;
  channelName: string | null;
  threadId: string | null;
  message: string;
  /** Time before the event ends, in milliseconds. */
  duration: number;
  roles: string[];
  linkedOnly: boolean;
  clans: ReminderClanDto[];
  /** Runs from the last 3 days and upcoming ones, oldest first. The bot drops older runs. */
  schedules: ReminderScheduleDto[];
  /** @format date-time */
  createdAt: string;
}

export interface CapitalRaidReminderDto {
  allMembers: boolean;
  minThreshold: number;
  remaining: number[];
  id: string;
  /** Short ID the bot shows in Discord: the last 5 hex characters, uppercased. */
  shortId: string;
  channelId: string;
  channelName: string | null;
  threadId: string | null;
  message: string;
  /** Time before the event ends, in milliseconds. */
  duration: number;
  roles: string[];
  linkedOnly: boolean;
  clans: ReminderClanDto[];
  /** Runs from the last 3 days and upcoming ones, oldest first. The bot drops older runs. */
  schedules: ReminderScheduleDto[];
  /** @format date-time */
  createdAt: string;
}

export interface ClanGamesReminderDto {
  allMembers: boolean;
  minPoints: number;
  id: string;
  /** Short ID the bot shows in Discord: the last 5 hex characters, uppercased. */
  shortId: string;
  channelId: string;
  channelName: string | null;
  threadId: string | null;
  message: string;
  /** Time before the event ends, in milliseconds. */
  duration: number;
  roles: string[];
  linkedOnly: boolean;
  clans: ReminderClanDto[];
  /** Runs from the last 3 days and upcoming ones, oldest first. The bot drops older runs. */
  schedules: ReminderScheduleDto[];
  /** @format date-time */
  createdAt: string;
}

export interface GuildRemindersDto {
  clanWars: ClanWarReminderDto[];
  capitalRaids: CapitalRaidReminderDto[];
  clanGames: ClanGamesReminderDto[];
}

export interface GuildChannelDto {
  id: string;
  name: string;
  /** Discord channel type: 0 text, 5 announcement, 15 forum, 16 media; 10, 11, 12 threads. */
  type: number;
  /** A channel's category, or a thread's channel. */
  parentId: string | null;
  /** False for a forum or media channel, which is listed only as the heading of its posts. */
  selectable: boolean;
  /** ClashPerk already has a webhook here (a thread's is its channel's), so no Discord sign-in is needed. */
  hasWebhook: boolean;
}

export interface GuildRoleDto {
  id: string;
  name: string;
  color: number;
  position: number;
}

export interface ReminderPingsDto {
  /** optIn pings only members with the role; optOut skips them. */
  mode: 'optIn' | 'optOut';
  /** @pattern ^\d{17,20}$ */
  clanWarsRole: string | null;
  /** @pattern ^\d{17,20}$ */
  capitalRaidsRole: string | null;
  /** @pattern ^\d{17,20}$ */
  clanGamesRole: string | null;
}

export interface ReminderPingsInput {
  /** optIn pings only members with the role; optOut skips them. */
  mode: 'optIn' | 'optOut';
  /** @pattern ^\d{17,20}$ */
  clanWarsRole: string | null;
  /** @pattern ^\d{17,20}$ */
  capitalRaidsRole: string | null;
  /** @pattern ^\d{17,20}$ */
  clanGamesRole: string | null;
}

export interface ReminderWebhookInput {
  /** @pattern ^\d{17,20}$ */
  id: string;
  /** @minLength 1 */
  token: string;
}

export interface ClanWarReminderInput {
  /** @uniqueItems true */
  roles: ReminderClanRole[];
  /**
   * Ping members with this many attacks left; empty pings nobody.
   * @uniqueItems true
   */
  remaining: WarAttacksLeft[];
  /**
   * @minItems 1
   * @uniqueItems true
   */
  warTypes: ReminderWarType[];
  disabled: boolean;
  /** @uniqueItems true */
  townHalls: number[];
  /** Skip once the clan reaches 100% destruction. */
  smartSkip: boolean;
  /** Post the message only, without mentioning members. */
  silent: boolean;
  /** @pattern ^\d{17,20}$ */
  channelId: string;
  /** From Discord's `webhook.incoming` sign-in; without one, a known webhook in the channel is reused. */
  webhook?: ReminderWebhookInput;
  /**
   * @minLength 1
   * @maxLength 1800
   */
  message: string;
  /**
   * Time before the event ends, in milliseconds.
   * @min 900000
   */
  duration: number;
  linkedOnly: boolean;
  /**
   * @maxItems 100
   * @minItems 1
   * @uniqueItems true
   */
  clans: string[];
}

export interface ReminderIdDto {
  id: string;
}

export interface CapitalRaidReminderInput {
  /** @uniqueItems true */
  roles: ReminderClanRole[];
  /** @uniqueItems true */
  remaining: RaidAttacksLeft[];
  allMembers: boolean;
  /**
   * @min 0
   * @max 6
   */
  minThreshold: number;
  /** @pattern ^\d{17,20}$ */
  channelId: string;
  /** From Discord's `webhook.incoming` sign-in; without one, a known webhook in the channel is reused. */
  webhook?: ReminderWebhookInput;
  /**
   * @minLength 1
   * @maxLength 1800
   */
  message: string;
  /**
   * Time before the event ends, in milliseconds.
   * @min 900000
   */
  duration: number;
  linkedOnly: boolean;
  /**
   * @maxItems 100
   * @minItems 1
   * @uniqueItems true
   */
  clans: string[];
}

export interface ClanGamesReminderInput {
  /** @uniqueItems true */
  roles: ReminderClanRole[];
  allMembers: boolean;
  /**
   * @min 0
   * @max 10000
   */
  minPoints: number;
  /** @pattern ^\d{17,20}$ */
  channelId: string;
  /** From Discord's `webhook.incoming` sign-in; without one, a known webhook in the channel is reused. */
  webhook?: ReminderWebhookInput;
  /**
   * @minLength 1
   * @maxLength 1800
   */
  message: string;
  /**
   * Time before the event ends, in milliseconds.
   * @min 900000
   */
  duration: number;
  linkedOnly: boolean;
  /**
   * @maxItems 100
   * @minItems 1
   * @uniqueItems true
   */
  clans: string[];
}

export interface GuildClanLogDto {
  logType: ClanLogType;
  channelStatus: ChannelStatus;
  clanTag: string;
  id: string;
  channelId: string;
  channelName: string | null;
  /** The channel a thread is in; null for channels. */
  parentChannelName: string | null;
  isEnabled: boolean;
  roleId: string | null;
  color: number | null;
  /** @format date-time */
  updatedAt: string;
}

export interface ClanLogLimitDto {
  /** How many clans can have logs in this server. */
  limit: number;
  /** Clans that already have logs; adding logs to these never hits the limit. */
  clanTags: string[];
  patron: boolean;
}

export interface ClanEmbedDto {
  fields: ClanEmbedField[];
  channelId: string;
  channelName: string | null;
  color: number | null;
  /** Null when it shows the in-game clan description. */
  description: string | null;
  /** Null when it shows the in-game Town Hall requirement. */
  requirements: string | null;
  bannerImage: string | null;
  /** The posted message, once the bot has sent it. */
  messageId: string | null;
  /** @format date-time */
  updatedAt: string;
}

export interface ClanEmbedStateDto {
  /** Null when the clan has no embed. */
  embed: ClanEmbedDto | null;
}

export interface ClanEmbedInput {
  /** @maxItems 9 */
  fields: ClanEmbedField[];
  /** @pattern ^\d{17,20}$ */
  channelId: string;
  /** From Discord's `webhook.incoming` sign-in; without one, a known webhook in the channel is reused. */
  webhook?: ReminderWebhookInput;
  /**
   * Embed color as an RGB integer; null uses the server's default.
   * @min 0
   * @max 16777215
   */
  color?: number | null;
  /**
   * Null shows the in-game clan description.
   * @minLength 1
   * @maxLength 1200
   */
  description?: string | null;
  /**
   * Null shows the in-game Town Hall requirement.
   * @minLength 1
   * @maxLength 600
   */
  requirements?: string | null;
  /**
   * @format uri
   * @maxLength 256
   */
  bannerImage?: string | null;
}

export interface ClanLogDto {
  logType: ClanLogType;
  channelStatus: ChannelStatus;
  id: string;
  channelId: string;
  channelName: string | null;
  /** The channel a thread is in; null for channels. */
  parentChannelName: string | null;
  isEnabled: boolean;
  roleId: string | null;
  color: number | null;
  /** @format date-time */
  updatedAt: string;
}

export interface ClanLogInput {
  /** @pattern ^\d{17,20}$ */
  channelId: string;
  /** From Discord's `webhook.incoming` sign-in; without one, a known webhook in the channel is reused. */
  webhook?: ReminderWebhookInput;
  isEnabled: boolean;
  /**
   * Pinged with each post; null for none.
   * @pattern ^\d{17,20}$
   */
  roleId: string | null;
  /**
   * Embed color as an RGB integer; null uses the server's default.
   * @min 0
   * @max 16777215
   */
  color: number | null;
}

export interface AutoRoleClanDto {
  tag: string;
  name: string;
  leader: string | null;
  coLeader: string | null;
  elder: string | null;
  member: string | null;
  everyone: string | null;
  warRole: string | null;
}

export interface NicknameRoleLabels {
  /** @maxLength 10 */
  leader: string;
  /** @maxLength 10 */
  coLeader: string;
  /** @maxLength 10 */
  elder: string;
  /** @maxLength 10 */
  member: string;
}

export interface AutoRolesDto {
  townHall: Record<string, string>;
  builderHall: Record<string, string>;
  leagues: Record<string, string>;
  builderLeagues: Record<string, string>;
  trophies: Record<string, string>;
  delayExclusions: DelayExclusion[];
  nicknameAccount: NicknameAccount;
  familyRole: string | null;
  exclusiveFamilyRole: string | null;
  familyLeadersRoles: string[];
  guestRole: string | null;
  verifiedRole: string | null;
  linkedRole: string | null;
  eosPushRole: string | null;
  eosPushClans: string[];
  /** Town Hall and Builder Hall roles also go to accounts outside the server's clans. */
  allowNonFamilyTownHall: boolean;
  /** League and builder league roles also go to accounts outside the server's clans. */
  allowNonFamilyLeagues: boolean;
  verifiedOnlyClanRoles: boolean;
  autoUpdate: boolean;
  forceRefresh: boolean;
  /** Members with no linked account still get roles like the guest role. */
  allowNotLinked: boolean;
  /** Milliseconds; one of the bot's choices. */
  removalDelay: number;
  additionDelay: number;
  clans: AutoRoleClanDto[];
  /** Nickname format for members in your clans; "" means none. */
  familyNicknameFormat: string;
  /** Nickname format for everyone else; "" means none. */
  nonFamilyNicknameFormat: string;
  /** Nicknames change on the bot's checks, not only on a refresh. */
  autoNickname: boolean;
  nicknameRoleLabels: NicknameRoleLabels;
}

export interface AutoRolesInput {
  townHall?: Record<string, string>;
  builderHall?: Record<string, string>;
  leagues?: Record<string, string>;
  builderLeagues?: Record<string, string>;
  trophies?: Record<string, string>;
  delayExclusions?: DelayExclusion[];
  nicknameAccount?: NicknameAccount;
  /** @pattern ^\d{17,20}$ */
  familyRole?: string | null;
  /** @pattern ^\d{17,20}$ */
  exclusiveFamilyRole?: string | null;
  /** @maxItems 25 */
  familyLeadersRoles?: string[];
  /** @pattern ^\d{17,20}$ */
  guestRole?: string | null;
  /** @pattern ^\d{17,20}$ */
  verifiedRole?: string | null;
  /** @pattern ^\d{17,20}$ */
  linkedRole?: string | null;
  /** @pattern ^\d{17,20}$ */
  eosPushRole?: string | null;
  eosPushClans?: string[];
  allowNonFamilyTownHall?: boolean;
  allowNonFamilyLeagues?: boolean;
  verifiedOnlyClanRoles?: boolean;
  autoUpdate?: boolean;
  forceRefresh?: boolean;
  allowNotLinked?: boolean;
  removalDelay?:
    | 0
    | 3600000
    | 7200000
    | 14400000
    | 21600000
    | 28800000
    | 43200000
    | 64800000
    | 86400000
    | 129600000
    | 172800000
    | 259200000
    | 604800000
    | 1036800000;
  additionDelay?:
    0 | 3600000 | 7200000 | 14400000 | 21600000 | 28800000 | 43200000 | 64800000 | 86400000;
  /** @maxLength 100 */
  familyNicknameFormat?: string;
  /** @maxLength 100 */
  nonFamilyNicknameFormat?: string;
  autoNickname?: boolean;
  nicknameRoleLabels?: NicknameRoleLabels;
}

export interface AutoRoleClanInput {
  /** @pattern ^\d{17,20}$ */
  leader: string | null;
  /** @pattern ^\d{17,20}$ */
  coLeader: string | null;
  /** @pattern ^\d{17,20}$ */
  elder: string | null;
  /** @pattern ^\d{17,20}$ */
  member: string | null;
  /** @pattern ^\d{17,20}$ */
  everyone: string | null;
  /** @pattern ^\d{17,20}$ */
  warRole: string | null;
}

export interface FlagAuthorDto {
  id: string;
  username: string;
  displayName: string;
}

export interface FlagDto {
  flagType: FlagType;
  id: string;
  /** The short reference the bot shows, e.g. in `/flag delete`. */
  refId: string;
  tag: string;
  name: string;
  /** Strike points; 1 unless set. */
  flagImpact: number;
  reason: string;
  /**
   * Null when it never expires.
   * @format date-time
   */
  expiresAt: string | null;
  /** @format date-time */
  createdAt: string;
  createdBy: FlagAuthorDto;
}

export interface FlagsDto {
  /** Active flags, newest first. */
  items: FlagDto[];
  /** Active flags of both types, against the limit. */
  total: number;
  /** Null for supporter servers, which have no limit. */
  limit: number | null;
}

export interface FlagInput {
  flagType: FlagType;
  /**
   * One or more player tags; the bot's option fits about 25.
   * @maxItems 25
   * @minItems 1
   */
  playerTags: string[];
  /**
   * @minLength 1
   * @maxLength 256
   */
  reason: string;
  /**
   * Leave out for a flag that never expires.
   * @min 1
   * @max 36500
   */
  expiresInDays?: number | null;
  /**
   * Strike points, 1 to 100; defaults to 1. The bot stores it for bans too.
   * @min 1
   * @max 100
   */
  flagImpact?: number;
}

export interface ListMemberDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface FlagAlertLogDto {
  roleId: string | null;
  useAutoRole: boolean;
  channelId: string;
  /** Null when the bot can't see the channel any more. */
  channelName: string | null;
}

export interface ServerLogChannelDto {
  channelId: string;
  /** Null when the bot can't see the channel any more. */
  channelName: string | null;
}

export interface WelcomeLogDto {
  channelId: string;
  /** Null when the bot can't see the channel any more. */
  channelName: string | null;
  enabled: boolean;
  welcomeText: string;
  description: string;
  bannerImage: string | null;
  embedColor: number | null;
}

export interface ServerLogsDto {
  flagAlert: FlagAlertLogDto | null;
  rosterChangelog: ServerLogChannelDto | null;
  maintenance: ServerLogChannelDto | null;
  welcome: WelcomeLogDto | null;
}

export interface FlagAlertLogInput {
  /**
   * Pinged when a flagged player joins a clan; null for none.
   * @pattern ^\d{17,20}$
   */
  roleId?: string | null;
  /** Ping each clan's leader and co-leader roles from auto-roles instead of `roleId`. */
  useAutoRole?: boolean;
  /** @pattern ^\d{17,20}$ */
  channelId: string;
  /** From Discord's `webhook.incoming` sign-in; without one, a known webhook in the channel is reused. */
  webhook?: ReminderWebhookInput;
}

export interface ServerLogChannelInput {
  /** @pattern ^\d{17,20}$ */
  channelId: string;
  /** From Discord's `webhook.incoming` sign-in; without one, a known webhook in the channel is reused. */
  webhook?: ReminderWebhookInput;
}

export interface MaintenanceLogInput {
  /** @pattern ^\d{17,20}$ */
  channelId: string;
}

export interface WelcomeLogInput {
  /** @pattern ^\d{17,20}$ */
  channelId: string;
  /** From Discord's `webhook.incoming` sign-in; without one, a known webhook in the channel is reused. */
  webhook?: ReminderWebhookInput;
  /**
   * @minLength 1
   * @maxLength 500
   * @pattern \{\{user\}\}
   */
  welcomeText: string;
  /** @maxLength 2000 */
  description: string;
  /**
   * @format uri
   * @maxLength 256
   */
  bannerImage?: string | null;
  /**
   * RGB integer; null uses the bot's default.
   * @min 0
   * @max 16777215
   */
  embedColor?: number | null;
}

export interface ButtonMessageDto {
  /** Set for the link button only. */
  tokenField?: ButtonTokenField;
  title: string;
  description: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  color: number | null;
  buttonStyle: number;
}

export interface ButtonsDto {
  link: ButtonMessageDto | null;
  refresh: ButtonMessageDto | null;
  myRosters: ButtonMessageDto | null;
}

export interface ButtonMessageInput {
  /** Link button only: whether members enter their player token. */
  tokenField?: ButtonTokenField;
  /**
   * @minLength 1
   * @maxLength 256
   */
  title: string;
  /**
   * @minLength 1
   * @maxLength 2000
   */
  description: string;
  /** @maxLength 256 */
  imageUrl?: string | null;
  /** @maxLength 256 */
  thumbnailUrl?: string | null;
  /**
   * RGB integer; null for none.
   * @min 0
   * @max 16777215
   */
  color?: number | null;
  /** 1 blurple, 2 grey, 3 green, 4 red. */
  buttonStyle: 1 | 2 | 3 | 4;
}

export interface ManagerRolesDto {
  managerRoles: string[];
  rosterManagerRoles: string[];
  flagsManagerRoles: string[];
  linksManagerRoles: string[];
}

export interface ManagerRolesInput {
  /**
   * Can use every command and this dashboard, like Manage Server.
   * @maxItems 25
   */
  managerRoles?: string[];
  /** @maxItems 25 */
  rosterManagerRoles?: string[];
  /** @maxItems 25 */
  flagsManagerRoles?: string[];
  /** @maxItems 25 */
  linksManagerRoles?: string[];
}

export interface SubscriptionDto {
  active: boolean;
  /** A special tier such as `lifetime` or `gifted`; null for a regular plan. */
  tier: string | null;
}

export interface ServerConfigDto {
  color: number | null;
  webhookLimit: number;
  subscription: SubscriptionDto;
}

export interface ServerConfigInput {
  /**
   * RGB integer for the bot's embeds; null goes back to the default.
   * @min 0
   * @max 16777215
   */
  color?: number | null;
  /**
   * Most webhooks the bot creates in one channel before it shares them between logs.
   * @min 3
   * @max 8
   */
  webhookLimit?: number;
}

export interface GuildBetaDto {
  beta: boolean;
}

export interface GuildCategoryDto {
  id: string;
  name: string;
}

export interface TicketEmbedDto {
  title: string | null;
  description: string | null;
  color: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  footerText: string | null;
}

export interface TicketButtonDto {
  label: string;
  emoji: string | null;
  style: number;
}

export interface TicketQuestionDto {
  label: string;
  required: boolean;
}

export interface TicketTypeDto {
  id: string;
  label: string;
  emoji: string | null;
  buttonStyle: number;
  requireLinkedAccount: boolean;
  thMin: number | null;
  minTrophies: number | null;
  minLeagueTier: string | null;
  questions: TicketQuestionDto[];
  pingRoleIds: string[];
  viewOnlyRoleIds: string[];
  addRoleIds: string[];
  removeRoleIds: string[];
  openCategoryId: string | null;
  sleepCategoryId: string | null;
  namingConvention: string;
  createStaffThread: boolean;
  autoSleepHours: number | null;
  allowClaim: boolean;
}

export interface TicketLogChannelsDto {
  buttonClick: string | null;
  statusChange: string | null;
  ticketClose: string | null;
}

export interface TicketExtraButtonDto {
  kind: TicketExtraButtonKind;
  id: string;
  label: string;
  emoji: string | null;
  style: number;
  url: string | null;
}

export interface TicketPanelDto {
  displayMode: TicketDisplayMode;
  id: string;
  name: string;
  embed: TicketEmbedDto;
  button: TicketButtonDto;
  ticketTypes: TicketTypeDto[];
  logChannels: TicketLogChannelsDto;
  extraButtons: TicketExtraButtonDto[];
  extraButtonsPlacement: string;
  ticketCount: number;
  openTicketCount: number;
  /** @format date-time */
  updatedAt: string;
}

export interface TicketSavedReplyDto {
  name: string;
  content: string;
}

export interface TicketsDto {
  panels: TicketPanelDto[];
  savedReplies: TicketSavedReplyDto[];
}

export interface CreateTicketPanelInput {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
}

export interface TicketEmbedInput {
  /**
   * @minLength 1
   * @maxLength 256
   */
  title?: string | null;
  /**
   * @minLength 1
   * @maxLength 2000
   */
  description?: string | null;
  /**
   * @min 1
   * @max 16777215
   */
  color?: number | null;
  /**
   * @format uri
   * @maxLength 512
   */
  imageUrl?: string | null;
  /**
   * @format uri
   * @maxLength 512
   */
  thumbnailUrl?: string | null;
  /**
   * @minLength 1
   * @maxLength 2048
   */
  footerText?: string | null;
}

export interface TicketButtonInput {
  /**
   * @minLength 1
   * @maxLength 80
   */
  label: string;
  /** @maxLength 56 */
  emoji?: string | null;
  /**
   * Discord button style: 1 blue, 2 grey, 3 green, 4 red.
   * @min 1
   * @max 4
   */
  style: number;
}

export interface TicketLogChannelsInput {
  /** Every click on the panel. */
  buttonClick?: string | null;
  /** Tickets put to sleep, reopened or claimed. */
  statusChange?: string | null;
  /** Closed tickets, with a transcript of the last 100 messages. */
  ticketClose?: string | null;
}

export interface TicketExtraButtonInput {
  kind: TicketExtraButtonKind;
  /**
   * @minLength 1
   * @maxLength 80
   */
  label: string;
  /** @maxLength 56 */
  emoji?: string | null;
  /**
   * Ignored for link buttons, which Discord always shows grey.
   * @min 1
   * @max 4
   */
  style?: number;
  /**
   * @format uri
   * @maxLength 256
   */
  url?: string;
}

export interface TicketPanelInput {
  displayMode?: TicketDisplayMode;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name?: string;
  embed?: TicketEmbedInput;
  button?: TicketButtonInput;
  logChannels?: TicketLogChannelsInput;
  /** @maxItems 10 */
  extraButtons?: TicketExtraButtonInput[];
  /** `row` keeps extra buttons beside the type buttons; `col` starts a new row. */
  extraButtonsPlacement?: 'row' | 'col';
}

export interface CreateTicketTypeInput {
  /**
   * @minLength 1
   * @maxLength 80
   */
  label: string;
  /** @maxLength 56 */
  emoji?: string | null;
}

export interface ReorderTicketTypesInput {
  /** @maxItems 25 */
  typeIds: string[];
}

export interface TicketQuestionInput {
  /**
   * Discord shows at most 45 characters in the form.
   * @minLength 1
   * @maxLength 45
   */
  label: string;
  required: boolean;
}

export interface TicketTypeInput {
  /**
   * @minLength 1
   * @maxLength 80
   */
  label?: string;
  /** @maxLength 56 */
  emoji?: string | null;
  /**
   * Used in buttons mode.
   * @min 1
   * @max 4
   */
  buttonStyle?: number;
  /** Requirements below only apply when this is on. */
  requireLinkedAccount?: boolean;
  /**
   * @min 1
   * @max 20
   */
  thMin?: number | null;
  /**
   * @min 1
   * @max 10000
   */
  minTrophies?: number | null;
  /**
   * 105000013 (Valkyrie League 13) to 105000036 (Legend League).
   * @pattern ^1050000(1[3-9]|2\d|3[0-6])$
   */
  minLeagueTier?: string | null;
  /** @maxItems 5 */
  questions?: TicketQuestionInput[];
  /**
   * Pinged on new tickets, and staff on them.
   * @maxItems 10
   */
  pingRoleIds?: string[];
  /** @maxItems 10 */
  viewOnlyRoleIds?: string[];
  /**
   * Given to the member who opens the ticket.
   * @maxItems 10
   */
  addRoleIds?: string[];
  /**
   * Taken from the member who opens the ticket.
   * @maxItems 10
   */
  removeRoleIds?: string[];
  openCategoryId?: string | null;
  sleepCategoryId?: string | null;
  /**
   * `{count}`, `{user}`, `{account_name}` and `{account_th}` are filled in.
   * @minLength 1
   * @maxLength 64
   */
  namingConvention?: string;
  createStaffThread?: boolean;
  /**
   * @min 1
   * @max 999
   */
  autoSleepHours?: number | null;
  allowClaim?: boolean;
}

export interface TicketSavedReplyInput {
  /**
   * @minLength 1
   * @maxLength 64
   */
  name: string;
  /**
   * @minLength 1
   * @maxLength 1800
   */
  content: string;
}

export interface TicketSavedRepliesInput {
  /** @maxItems 25 */
  savedReplies: TicketSavedReplyInput[];
}

export interface MessageOkDto {
  message: string;
}

export interface ExportMembersInput {
  /**
   * @maxItems 100
   * @minItems 1
   */
  clanTags: string[];
  guildId: string;
  scheduled: boolean;
}

export interface ExportMembersOutputDto {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export interface CommandsUsageLogDto {
  userId: string;
  commandId: string;
  guildId: string;
  createdAt: number;
}

export interface CommandsUsageLogItemsDto {
  items: CommandsUsageLogDto[];
}

export interface BetaGuildDto {
  guildId: string;
  /** Null when ClashPerk isn't in the server. */
  name: string | null;
  iconUrl: string | null;
  note: string | null;
  addedBy: string;
  /** @format date-time */
  createdAt: string;
}

export interface BetaGuildsDto {
  guilds: BetaGuildDto[];
}

export interface AddBetaGuildsInput {
  /**
   * @maxItems 100
   * @minItems 1
   */
  guildIds: string[];
  /**
   * @minLength 1
   * @maxLength 200
   */
  note?: string | null;
}

export interface BetaGuildIdsDto {
  guildIds: string[];
}

export interface SubscriberServerDto {
  id: string;
  name: string;
  /** Clans this subscription lets the server have logs for. */
  clanLimit: number;
}

export interface SubscriberDto {
  provider: SubscriptionProvider;
  cadence: BillingCadence;
  id: string;
  name: string;
  /** The Discord account that redeemed it; null until someone does. */
  discordUserId: string | null;
  discordUsername: string | null;
  /** Bronze, silver or gold; null for special tiers or an unknown reward. */
  plan: string | null;
  /** A special tier such as `lifetime` or `gifted`. */
  tier: string | null;
  active: boolean;
  /** The provider's own status, e.g. `active_patron` or `declined_patron`. */
  status: string | null;
  /** What each charge bills, for a month or a year. */
  billedCents: number;
  /** The charge spread per month, estimated for yearly plans. */
  monthlyCents: number;
  lifetimeCents: number;
  customBot: boolean;
  servers: SubscriberServerDto[];
  /** @format date-time */
  lastChargeDate: string | null;
  /** @format date-time */
  createdAt: string;
}

export interface SubscribersDto {
  subscribers: SubscriberDto[];
}

export interface DeveloperDto {
  roles: UserRoles[];
  userId: string;
  username: string;
  displayName: string;
  isBot: boolean;
  /**
   * Null for accounts made before it was recorded.
   * @format date-time
   */
  createdAt: string | null;
  /** @format date-time */
  lastLoginAt: string | null;
}

export interface DevelopersDto {
  developers: DeveloperDto[];
}

export interface AddDeveloperInput {
  /**
   * @maxItems 11
   * @minItems 1
   */
  roles: UserRoles[];
  /** @pattern ^\d{17,20}$ */
  userId: string;
}

export interface AddedDeveloperDto {
  developer: DeveloperDto;
  /** Shown once; the account signs in with it at /auth/login. */
  passKey: string;
}

export interface EditDeveloperInput {
  /**
   * @maxItems 11
   * @minItems 1
   */
  roles: UserRoles[];
}

export type LoginData = LoginOkDto;

export type LoginError = ErrorResponseDto;

export type GeneratePasskeyData = GenerateTokenDto;

export type GeneratePasskeyError = ErrorResponseDto;

export interface GetAuthUserParams {
  userId: string;
}

export type GetAuthUserData = AuthUserDto;

export type GetAuthUserError = ErrorResponseDto;

export interface DecodeHandoffTokenParams {
  token: string;
}

export type DecodeHandoffTokenData = HandoffUserDto;

export type DecodeHandoffTokenError = ErrorResponseDto;

export type CreateHandoffTokenData = HandoffTokenDto;

export type CreateHandoffTokenError = ErrorResponseDto;

export type GetBotGuildsData = BotGuildsDto;

export type GetBotGuildsError = ErrorResponseDto;

export type GetBotGuildsViaPostData = BotGuildsDto;

export type GetBotGuildsViaPostError = ErrorResponseDto;

export type GetManagedGuildsData = ManagedGuildsDto;

export type GetManagedGuildsError = ErrorResponseDto;

export type GetManagedGuildsViaPostData = ManagedGuildsDto;

export type GetManagedGuildsViaPostError = ErrorResponseDto;

export type GetGuildAccessData = GuildAccessDto;

export type GetGuildAccessError = ErrorResponseDto;

export type GetGuildAccessViaPostData = GuildAccessDto;

export type GetGuildAccessViaPostError = ErrorResponseDto;

export type LinkData = ResultOkDto;

export type LinkError = ErrorResponseDto;

export interface UnlinkParams {
  playerTag: string;
}

export type UnlinkData = ResultOkDto;

export type UnlinkError = ErrorResponseDto;

export interface SetDefaultLinkParams {
  playerTag: string;
}

export type SetDefaultLinkData = ResultOkDto;

export type SetDefaultLinkError = ErrorResponseDto;

export type GetLinksData = LinksDto[];

export type GetLinksError = ErrorResponseDto;

export type GetLinksViaPostData = LinksDto[];

export type GetLinksViaPostError = ErrorResponseDto;

export type GetActivityData = ClanActivityDto;

export type GetActivityError = ErrorResponseDto;

export type GetActivityViaPostData = ClanActivityDto;

export type GetActivityViaPostError = ErrorResponseDto;

export interface GetClanParams {
  clanTag: string;
}

export type GetClanData = ClanDto;

export type GetClanError = ErrorResponseDto;

export interface GetLastSeenParams {
  clanTag: string;
}

export type GetLastSeenData = LastSeenDto;

export type GetLastSeenError = ErrorResponseDto;

export interface GetCapitalContributionParams {
  /**
   * @pattern ^\d{4}-\d{2}$
   * @example "2026-09"
   */
  season?: string;
  clanTag: string;
}

export type GetCapitalContributionData = CapitalContributionDto;

export type GetCapitalContributionError = ErrorResponseDto;

export interface GetCapitalRaidsParams {
  /**
   * @min 1
   * @max 60
   * @default 5
   */
  limit?: number;
  clanTag: string;
}

export type GetCapitalRaidsData = CapitalRaidsDto;

export type GetCapitalRaidsError = ErrorResponseDto;

export interface GetClanGamesParams {
  /**
   * `YYYY-MM`; defaults to the latest Clan Games (last month's until the 20th).
   * @pattern ^\d{4}-\d{2}$
   * @example "2026-10"
   */
  season?: string;
  clanTag: string;
}

export type GetClanGamesData = ClanGamesDto;

export type GetClanGamesError = ErrorResponseDto;

export interface GetClanLinksParams {
  clanTag: string;
}

export type GetClanLinksData = ClanLinksDto;

export type GetClanLinksError = ErrorResponseDto;

export interface GetPlayerParams {
  playerTag: string;
}

export type GetPlayerData = PlayerDto;

export type GetPlayerError = ErrorResponseDto;

export interface AddPlayerAccountParams {
  playerTag: string;
}

export type AddPlayerAccountData = ResultOkDto;

export type AddPlayerAccountError = ErrorResponseDto;

export interface GetSeasonStatsParams {
  /**
   * @min 1
   * @max 12
   * @default 2
   */
  limit?: number;
  playerTag: string;
}

export type GetSeasonStatsData = PlayerSeasonStatsItemsDto;

export type GetSeasonStatsError = ErrorResponseDto;

export interface GetRankedParams {
  playerTag: string;
}

export type GetRankedData = RankedDto;

export type GetRankedError = ErrorResponseDto;

export interface GetBattleLogParams {
  playerTag: string;
}

export type GetBattleLogData = BattleLogItemsDto;

export type GetBattleLogError = ErrorResponseDto;

export interface GetBattleLogAggregateParams {
  playerTag: string;
}

export type GetBattleLogAggregateData = BattleLogAggregateItemsDto;

export type GetBattleLogAggregateError = ErrorResponseDto;

export type GetBattleLogLeaderboardData = BattleLogLeaderboardDto;

export type GetBattleLogLeaderboardError = ErrorResponseDto;

export type GetBattleLogLeaderboardViaPostData = BattleLogLeaderboardDto;

export type GetBattleLogLeaderboardViaPostError = ErrorResponseDto;

export interface GetClanHistoryParams {
  playerTag: string;
}

export type GetClanHistoryData = ClanHistoryItemsDto;

export type GetClanHistoryError = ErrorResponseDto;

export interface GetAttackHistoryParams {
  /**
   * The newest wars first, at most this many.
   * @min 1
   * @max 100
   * @default 50
   */
  limit?: number;
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  startDate?: string;
  playerTag: string;
}

export type GetAttackHistoryData = AttackHistoryItemsDto;

export type GetAttackHistoryError = ErrorResponseDto;

export interface AggregateAttackHistoryParams {
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  startDate: string;
  playerTag: string;
}

export type AggregateAttackHistoryData = AggregateAttackHistoryItemsDto;

export type AggregateAttackHistoryError = ErrorResponseDto;

export interface AggregateClanWarLeagueHistoryParams {
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  startDate: string;
  playerTag: string;
}

export type AggregateClanWarLeagueHistoryData = AggregateClanWarLeagueHistoryItemsDto;

export type AggregateClanWarLeagueHistoryError = ErrorResponseDto;

export type GetLegendRankingThresholdsData = LegendRankingThresholdsDto;

export type GetLegendRankingThresholdsError = ErrorResponseDto;

export type GetLegendAttacksData = LegendAttacksItemsDto;

export type GetLegendAttacksError = ErrorResponseDto;

export type GetLegendAttacksViaPostData = LegendAttacksItemsDto;

export type GetLegendAttacksViaPostError = ErrorResponseDto;

export interface GetLegendAttacksByPlayerTagParams {
  /**
   * The league season's start date; the current season when left out.
   * @pattern ^\d{4}-\d{2}-\d{2}$
   * @example "2026-10-05"
   */
  seasonId?: string;
  playerTag: string;
}

export type GetLegendAttacksByPlayerTagData = LegendAttacksDto;

export type GetLegendAttacksByPlayerTagError = ErrorResponseDto;

export interface GetLegendSeasonsParams {
  playerTag: string;
}

export type GetLegendSeasonsData = LegendSeasonsDto;

export type GetLegendSeasonsError = ErrorResponseDto;

export interface EstimateRankParams {
  playerTag: string;
}

export type EstimateRankData = LegendRankDto;

export type EstimateRankError = ErrorResponseDto;

export interface GetClanWarLeagueGroupsParams {
  clanTag: string;
}

export type GetClanWarLeagueGroupsData = ClanWarLeaguesDto;

export type GetClanWarLeagueGroupsError = ErrorResponseDto;

export interface GetClanWarLeagueForClanParams {
  clanTag: string;
}

export type GetClanWarLeagueForClanData = ClanWarLeaguesDto;

export type GetClanWarLeagueForClanError = ErrorResponseDto;

export interface GetClanWarLeagueSeasonsParams {
  /**
   * @min 1
   * @max 12
   * @default 3
   */
  limit?: number;
  clanTag: string;
}

export type GetClanWarLeagueSeasonsData = ClanWarLeagueSeasonsDto;

export type GetClanWarLeagueSeasonsError = ErrorResponseDto;

export interface GetClanWarStatsParams {
  /**
   * Regular and CWL wars, regular only, or CWL only; friendly wars never count.
   * @default "all"
   */
  type?: 'all' | 'regular' | 'cwl';
  /**
   * How many of the latest ended wars to count, for `all` and `regular`.
   * @min 1
   * @max 100
   * @default 25
   */
  wars?: number;
  /**
   * How many of the latest CWL seasons to count, for `cwl`.
   * @min 1
   * @max 12
   * @default 3
   */
  seasons?: number;
  clanTag: string;
}

export type GetClanWarStatsData = ClanWarStatsDto;

export type GetClanWarStatsError = ErrorResponseDto;

export interface GetClanWarLeagueStandingsParams {
  clanTag: string;
  groupId: number;
}

export type GetClanWarLeagueStandingsData = ClanWarLeagueStandingsDto;

export type GetClanWarLeagueStandingsError = ErrorResponseDto;

export interface GetClanWarsParams {
  /**
   * @min 1
   * @max 50
   * @default 20
   */
  limit?: number;
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  before?: string;
  clanTag: string;
}

export type GetClanWarsData = ClanWarListDto;

export type GetClanWarsError = ErrorResponseDto;

export interface GetCurrentWarParams {
  clanTag: string;
}

export type GetCurrentWarData = CurrentWarDto;

export type GetCurrentWarError = ErrorResponseDto;

export interface GetClanWarParams {
  clanTag: string;
  warId: string;
}

export type GetClanWarData = ClanWarDto;

export type GetClanWarError = ErrorResponseDto;

export interface GetEventsParams {
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  from: string;
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  to: string;
}

export type GetEventsData = GameEventsDto;

export type GetEventsError = ErrorResponseDto;

export type GetUpcomingEventsData = UpcomingEventsDto;

export type GetUpcomingEventsError = ErrorResponseDto;

export interface GetRostersParams {
  guildId: string;
}

export type GetRostersData = GetRostersDto;

export type GetRostersError = ErrorResponseDto;

export interface CreateRosterParams {
  guildId: string;
}

export type CreateRosterData = RostersEntity;

export type CreateRosterError = ErrorResponseDto;

export interface CreateRosterGroupParams {
  guildId: string;
}

export type CreateRosterGroupData = GetRostersDto;

export type CreateRosterGroupError = ErrorResponseDto;

export interface UpdateRosterGroupParams {
  guildId: string;
  groupId: string;
}

export type UpdateRosterGroupData = GetRostersDto;

export type UpdateRosterGroupError = ErrorResponseDto;

export interface DeleteRosterGroupParams {
  guildId: string;
  groupId: string;
}

export type DeleteRosterGroupData = GetRostersDto;

export type DeleteRosterGroupError = ErrorResponseDto;

export interface GetRosterParams {
  rosterId: string;
  guildId: string;
}

export type GetRosterData = RostersEntity;

export type GetRosterError = ErrorResponseDto;

export interface UpdateRosterParams {
  guildId: string;
  rosterId: string;
}

export type UpdateRosterData = RostersEntity;

export type UpdateRosterError = ErrorResponseDto;

export interface DeleteRosterParams {
  guildId: string;
  rosterId: string;
}

export type DeleteRosterData = any;

export type DeleteRosterError = ErrorResponseDto;

export interface CloneRosterParams {
  guildId: string;
  rosterId: string;
}

export type CloneRosterData = RostersEntity;

export type CloneRosterError = ErrorResponseDto;

export interface CheckRosterMembersParams {
  guildId: string;
  rosterId: string;
}

export type CheckRosterMembersData = RosterPlayerCheckDto[];

export type CheckRosterMembersError = ErrorResponseDto;

export interface CheckRosterMembersViaPostParams {
  guildId: string;
  rosterId: string;
}

export type CheckRosterMembersViaPostData = RosterPlayerCheckDto[];

export type CheckRosterMembersViaPostError = ErrorResponseDto;

export interface AddRosterMembersParams {
  guildId: string;
  rosterId: string;
}

export type AddRosterMembersData = AddRosterMembersDto;

export type AddRosterMembersError = ErrorResponseDto;

export interface DeleteRosterMembersParams {
  rosterId: string;
  guildId: string;
}

export type DeleteRosterMembersData = RostersEntity;

export type DeleteRosterMembersError = ErrorResponseDto;

export interface RefreshRosterMembersParams {
  guildId: string;
  rosterId: string;
}

export type RefreshRosterMembersData = RostersEntity;

export type RefreshRosterMembersError = ErrorResponseDto;

export interface TransferRosterMembersParams {
  rosterId: string;
  guildId: string;
}

export type TransferRosterMembersData = TransferRosterMembersDto;

export type TransferRosterMembersError = ErrorResponseDto;

export type GetUserSettingsData = UserSettingsDto;

export type GetUserSettingsError = ErrorResponseDto;

export type SetDefaultClanData = UserSettingsDto;

export type SetDefaultClanError = ErrorResponseDto;

export type ClearDefaultClanData = UserSettingsDto;

export type ClearDefaultClanError = ErrorResponseDto;

export type AddBookmarkData = UserSettingsDto;

export type AddBookmarkError = ErrorResponseDto;

export interface RemoveBookmarkParams {
  clanTag: string;
}

export type RemoveBookmarkData = UserSettingsDto;

export type RemoveBookmarkError = ErrorResponseDto;

export type SetTimezoneData = UserSettingsDto;

export type SetTimezoneError = ErrorResponseDto;

export type ClearTimezoneData = UserSettingsDto;

export type ClearTimezoneError = ErrorResponseDto;

export interface GetGuildClansParams {
  guildId: string;
}

export type GetGuildClansData = GuildClansDto;

export type GetGuildClansError = ErrorResponseDto;

export interface AddGuildClanParams {
  guildId: string;
}

export type AddGuildClanData = GuildClansDto;

export type AddGuildClanError = ErrorResponseDto;

export interface ReorderGuildClansParams {
  guildId: string;
}

export type ReorderGuildClansData = GuildClansDto;

export type ReorderGuildClansError = ErrorResponseDto;

export interface RemoveGuildClanParams {
  guildId: string;
  clanTag: string;
}

export type RemoveGuildClanData = GuildClansDto;

export type RemoveGuildClanError = ErrorResponseDto;

export interface UpdateGuildClanParams {
  guildId: string;
  clanTag: string;
}

export type UpdateGuildClanData = GuildClansDto;

export type UpdateGuildClanError = ErrorResponseDto;

export interface CreateClanCategoryParams {
  guildId: string;
}

export type CreateClanCategoryData = GuildClansDto;

export type CreateClanCategoryError = ErrorResponseDto;

export interface RenameClanCategoryParams {
  guildId: string;
  categoryId: string;
}

export type RenameClanCategoryData = GuildClansDto;

export type RenameClanCategoryError = ErrorResponseDto;

export interface DeleteClanCategoryParams {
  guildId: string;
  categoryId: string;
}

export type DeleteClanCategoryData = GuildClansDto;

export type DeleteClanCategoryError = ErrorResponseDto;

export interface GetGuildRemindersParams {
  guildId: string;
}

export type GetGuildRemindersData = GuildRemindersDto;

export type GetGuildRemindersError = ErrorResponseDto;

export interface ListChannelsParams {
  guildId: string;
}

export type ListChannelsData = GuildChannelDto[];

export type ListChannelsError = ErrorResponseDto;

export interface ListRolesParams {
  guildId: string;
}

export type ListRolesData = GuildRoleDto[];

export type ListRolesError = ErrorResponseDto;

export interface GetReminderPingsParams {
  guildId: string;
}

export type GetReminderPingsData = ReminderPingsDto;

export type GetReminderPingsError = ErrorResponseDto;

export interface SaveReminderPingsParams {
  guildId: string;
}

export type SaveReminderPingsData = ReminderPingsDto;

export type SaveReminderPingsError = ErrorResponseDto;

export interface CreateClanWarReminderParams {
  guildId: string;
}

export type CreateClanWarReminderData = ReminderIdDto;

export type CreateClanWarReminderError = ErrorResponseDto;

export interface UpdateClanWarReminderParams {
  guildId: string;
  reminderId: string;
}

export type UpdateClanWarReminderData = ReminderIdDto;

export type UpdateClanWarReminderError = ErrorResponseDto;

export interface DeleteClanWarReminderParams {
  guildId: string;
  reminderId: string;
}

export type DeleteClanWarReminderData = any;

export type DeleteClanWarReminderError = ErrorResponseDto;

export interface CreateCapitalRaidReminderParams {
  guildId: string;
}

export type CreateCapitalRaidReminderData = ReminderIdDto;

export type CreateCapitalRaidReminderError = ErrorResponseDto;

export interface UpdateCapitalRaidReminderParams {
  guildId: string;
  reminderId: string;
}

export type UpdateCapitalRaidReminderData = ReminderIdDto;

export type UpdateCapitalRaidReminderError = ErrorResponseDto;

export interface DeleteCapitalRaidReminderParams {
  guildId: string;
  reminderId: string;
}

export type DeleteCapitalRaidReminderData = any;

export type DeleteCapitalRaidReminderError = ErrorResponseDto;

export interface CreateClanGamesReminderParams {
  guildId: string;
}

export type CreateClanGamesReminderData = ReminderIdDto;

export type CreateClanGamesReminderError = ErrorResponseDto;

export interface UpdateClanGamesReminderParams {
  guildId: string;
  reminderId: string;
}

export type UpdateClanGamesReminderData = ReminderIdDto;

export type UpdateClanGamesReminderError = ErrorResponseDto;

export interface DeleteClanGamesReminderParams {
  guildId: string;
  reminderId: string;
}

export type DeleteClanGamesReminderData = any;

export type DeleteClanGamesReminderError = ErrorResponseDto;

export interface ListGuildClanLogsParams {
  guildId: string;
}

export type ListGuildClanLogsData = GuildClanLogDto[];

export type ListGuildClanLogsError = ErrorResponseDto;

export interface GetClanLogLimitParams {
  guildId: string;
}

export type GetClanLogLimitData = ClanLogLimitDto;

export type GetClanLogLimitError = ErrorResponseDto;

export interface GetClanEmbedParams {
  guildId: string;
  clanTag: string;
}

export type GetClanEmbedData = ClanEmbedStateDto;

export type GetClanEmbedError = ErrorResponseDto;

export interface SaveClanEmbedParams {
  guildId: string;
  clanTag: string;
}

export type SaveClanEmbedData = ClanEmbedDto;

export type SaveClanEmbedError = ErrorResponseDto;

export interface DeleteClanEmbedParams {
  guildId: string;
  clanTag: string;
}

export type DeleteClanEmbedData = any;

export type DeleteClanEmbedError = ErrorResponseDto;

export interface ListClanLogsParams {
  guildId: string;
  clanTag: string;
}

export type ListClanLogsData = ClanLogDto[];

export type ListClanLogsError = ErrorResponseDto;

export interface SaveClanLogParams {
  guildId: string;
  clanTag: string;
  logType: ClanLogType;
}

export type SaveClanLogData = ClanLogDto;

export type SaveClanLogError = ErrorResponseDto;

export interface DeleteClanLogParams {
  guildId: string;
  clanTag: string;
  logType: ClanLogType;
}

export type DeleteClanLogData = any;

export type DeleteClanLogError = ErrorResponseDto;

export interface GetAutoRolesParams {
  guildId: string;
}

export type GetAutoRolesData = AutoRolesDto;

export type GetAutoRolesError = ErrorResponseDto;

export interface SaveAutoRolesParams {
  guildId: string;
}

export type SaveAutoRolesData = AutoRolesDto;

export type SaveAutoRolesError = ErrorResponseDto;

export interface SaveClanAutoRolesParams {
  guildId: string;
  clanTag: string;
}

export type SaveClanAutoRolesData = AutoRolesDto;

export type SaveClanAutoRolesError = ErrorResponseDto;

export interface ListFlagsParams {
  flagType?: FlagType;
  guildId: string;
}

export type ListFlagsData = FlagsDto;

export type ListFlagsError = ErrorResponseDto;

export interface CreateFlagsParams {
  guildId: string;
}

export type CreateFlagsData = FlagDto[];

export type CreateFlagsError = ErrorResponseDto;

export interface DeleteFlagParams {
  guildId: string;
  flagId: string;
}

export type DeleteFlagData = any;

export type DeleteFlagError = ErrorResponseDto;

export interface ListMembersParams {
  query: string;
  guildId: string;
}

export type ListMembersData = ListMemberDto[];

export type ListMembersError = ErrorResponseDto;

export interface GetServerLogsParams {
  guildId: string;
}

export type GetServerLogsData = ServerLogsDto;

export type GetServerLogsError = ErrorResponseDto;

export interface SaveFlagAlertLogParams {
  guildId: string;
}

export type SaveFlagAlertLogData = ServerLogsDto;

export type SaveFlagAlertLogError = ErrorResponseDto;

export interface DeleteFlagAlertLogParams {
  guildId: string;
}

export type DeleteFlagAlertLogData = ServerLogsDto;

export type DeleteFlagAlertLogError = ErrorResponseDto;

export interface SaveRosterChangelogParams {
  guildId: string;
}

export type SaveRosterChangelogData = ServerLogsDto;

export type SaveRosterChangelogError = ErrorResponseDto;

export interface DeleteRosterChangelogParams {
  guildId: string;
}

export type DeleteRosterChangelogData = ServerLogsDto;

export type DeleteRosterChangelogError = ErrorResponseDto;

export interface SaveMaintenanceLogParams {
  guildId: string;
}

export type SaveMaintenanceLogData = ServerLogsDto;

export type SaveMaintenanceLogError = ErrorResponseDto;

export interface DeleteMaintenanceLogParams {
  guildId: string;
}

export type DeleteMaintenanceLogData = ServerLogsDto;

export type DeleteMaintenanceLogError = ErrorResponseDto;

export interface SaveWelcomeLogParams {
  guildId: string;
}

export type SaveWelcomeLogData = ServerLogsDto;

export type SaveWelcomeLogError = ErrorResponseDto;

export interface DeleteWelcomeLogParams {
  guildId: string;
}

export type DeleteWelcomeLogData = ServerLogsDto;

export type DeleteWelcomeLogError = ErrorResponseDto;

export interface GetButtonsParams {
  guildId: string;
}

export type GetButtonsData = ButtonsDto;

export type GetButtonsError = ErrorResponseDto;

export interface SaveButtonParams {
  guildId: string;
  buttonType: string;
}

export type SaveButtonData = ButtonsDto;

export type SaveButtonError = ErrorResponseDto;

export interface GetManagerRolesParams {
  guildId: string;
}

export type GetManagerRolesData = ManagerRolesDto;

export type GetManagerRolesError = ErrorResponseDto;

export interface SaveManagerRolesParams {
  guildId: string;
}

export type SaveManagerRolesData = ManagerRolesDto;

export type SaveManagerRolesError = ErrorResponseDto;

export interface GetConfigParams {
  guildId: string;
}

export type GetConfigData = ServerConfigDto;

export type GetConfigError = ErrorResponseDto;

export interface SaveConfigParams {
  guildId: string;
}

export type SaveConfigData = ServerConfigDto;

export type SaveConfigError = ErrorResponseDto;

export interface GetGuildBetaParams {
  guildId: string;
}

export type GetGuildBetaData = GuildBetaDto;

export type GetGuildBetaError = ErrorResponseDto;

export interface ListCategoriesParams {
  guildId: string;
}

export type ListCategoriesData = GuildCategoryDto[];

export type ListCategoriesError = ErrorResponseDto;

export interface GetTicketsParams {
  guildId: string;
}

export type GetTicketsData = TicketsDto;

export type GetTicketsError = ErrorResponseDto;

export interface CreateTicketPanelParams {
  guildId: string;
}

export type CreateTicketPanelData = TicketsDto;

export type CreateTicketPanelError = ErrorResponseDto;

export interface UpdateTicketPanelParams {
  guildId: string;
  panelId: string;
}

export type UpdateTicketPanelData = TicketsDto;

export type UpdateTicketPanelError = ErrorResponseDto;

export interface DeleteTicketPanelParams {
  guildId: string;
  panelId: string;
}

export type DeleteTicketPanelData = TicketsDto;

export type DeleteTicketPanelError = ErrorResponseDto;

export interface AddTicketTypeParams {
  guildId: string;
  panelId: string;
}

export type AddTicketTypeData = TicketsDto;

export type AddTicketTypeError = ErrorResponseDto;

export interface ReorderTicketTypesParams {
  guildId: string;
  panelId: string;
}

export type ReorderTicketTypesData = TicketsDto;

export type ReorderTicketTypesError = ErrorResponseDto;

export interface UpdateTicketTypeParams {
  guildId: string;
  panelId: string;
  typeId: string;
}

export type UpdateTicketTypeData = TicketsDto;

export type UpdateTicketTypeError = ErrorResponseDto;

export interface DeleteTicketTypeParams {
  guildId: string;
  panelId: string;
  typeId: string;
}

export type DeleteTicketTypeData = TicketsDto;

export type DeleteTicketTypeError = ErrorResponseDto;

export interface SaveTicketRepliesParams {
  guildId: string;
}

export type SaveTicketRepliesData = TicketsDto;

export type SaveTicketRepliesError = ErrorResponseDto;

export type ExportClanMembersData = ExportMembersOutputDto;

export type ExportClanMembersError = ErrorResponseDto;

export type ListBetaGuildsData = BetaGuildsDto;

export type ListBetaGuildsError = ErrorResponseDto;

export type AddBetaGuildsData = BetaGuildsDto;

export type AddBetaGuildsError = ErrorResponseDto;

export interface RemoveBetaGuildParams {
  guildId: string;
}

export type RemoveBetaGuildData = BetaGuildsDto;

export type RemoveBetaGuildError = ErrorResponseDto;

export type ListBetaGuildIdsData = BetaGuildIdsDto;

export type ListBetaGuildIdsError = ErrorResponseDto;

export type ListSubscribersData = SubscribersDto;

export type ListSubscribersError = ErrorResponseDto;

export type ListDevelopersData = DevelopersDto;

export type ListDevelopersError = ErrorResponseDto;

export type AddDeveloperData = AddedDeveloperDto;

export type AddDeveloperError = ErrorResponseDto;

export interface EditDeveloperParams {
  userId: string;
}

export type EditDeveloperData = DeveloperDto;

export type EditDeveloperError = ErrorResponseDto;

export interface RevokeDeveloperParams {
  userId: string;
}

export type RevokeDeveloperData = DevelopersDto;

export type RevokeDeveloperError = ErrorResponseDto;

export namespace Auth {
  /**
   * @description Authenticates a user using a `passKey` and returns an `accessToken` with a limited validity period (2 hours). Once the token expires, a new token must be generated.<br/><br/>The `accessToken` must be included in all protected API requests using the following header `Authorization: Bearer <accessToken>`
   * @tags Auth
   * @name Login
   * @summary Authenticate with your passKey to receive an accessToken required for authorized API requests.
   * @request POST:/auth/login
   * @response `201` `LoginData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace Login {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LoginInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = LoginData;
  }

  /**
   * No description
   * @tags Auth
   * @name GeneratePasskey
   * @summary Generate a passKey required for authentication.
   * @request POST:/auth/generate-passkey
   * @secure
   * @response `201` `GeneratePasskeyData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GeneratePasskey {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GenerateTokenInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GeneratePasskeyData;
  }

  /**
   * No description
   * @tags Auth
   * @name GetAuthUser
   * @request GET:/auth/users/{userId}
   * @secure
   * @response `200` `GetAuthUserData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetAuthUser {
    export type RequestParams = {
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAuthUserData;
  }

  /**
   * No description
   * @tags Auth
   * @name DecodeHandoffToken
   * @request GET:/auth/handoff/{token}
   * @secure
   * @response `200` `DecodeHandoffTokenData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DecodeHandoffToken {
    export type RequestParams = {
      token: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DecodeHandoffTokenData;
  }

  /**
   * No description
   * @tags Auth
   * @name CreateHandoffToken
   * @request POST:/auth/handoff
   * @secure
   * @response `201` `CreateHandoffTokenData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateHandoffToken {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = HandoffTokenInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = CreateHandoffTokenData;
  }

  /**
   * No description
   * @tags Auth
   * @name GetBotGuilds
   * @request QUERY:/auth/bot-guilds
   * @secure
   * @response `200` `GetBotGuildsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetBotGuilds {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BotGuildsInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetBotGuildsData;
  }

  /**
   * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
   * @tags Auth
   * @name GetBotGuildsViaPost
   * @request POST:/auth/bot-guilds
   * @deprecated
   * @secure
   * @response `200` `GetBotGuildsViaPostData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetBotGuildsViaPost {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BotGuildsInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetBotGuildsViaPostData;
  }

  /**
   * No description
   * @tags Auth
   * @name GetManagedGuilds
   * @request QUERY:/auth/managed-guilds
   * @secure
   * @response `200` `GetManagedGuildsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetManagedGuilds {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ManagedGuildsInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetManagedGuildsData;
  }

  /**
   * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
   * @tags Auth
   * @name GetManagedGuildsViaPost
   * @request POST:/auth/managed-guilds
   * @deprecated
   * @secure
   * @response `200` `GetManagedGuildsViaPostData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetManagedGuildsViaPost {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ManagedGuildsInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetManagedGuildsViaPostData;
  }

  /**
   * No description
   * @tags Auth
   * @name GetGuildAccess
   * @request QUERY:/auth/guild-access
   * @secure
   * @response `200` `GetGuildAccessData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetGuildAccess {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GuildAccessInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetGuildAccessData;
  }

  /**
   * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
   * @tags Auth
   * @name GetGuildAccessViaPost
   * @request POST:/auth/guild-access
   * @deprecated
   * @secure
   * @response `200` `GetGuildAccessViaPostData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetGuildAccessViaPost {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GuildAccessInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetGuildAccessViaPostData;
  }
}

export namespace Links {
  /**
   * No description
   * @tags Links
   * @name Link
   * @request POST:/links
   * @secure
   * @response `201` `LinkData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace Link {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateLinkInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = LinkData;
  }

  /**
   * No description
   * @tags Links
   * @name Unlink
   * @request DELETE:/links/{playerTag}
   * @secure
   * @response `200` `UnlinkData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace Unlink {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = UnlinkData;
  }

  /**
   * No description
   * @tags Links
   * @name SetDefaultLink
   * @summary Make one of your own linked accounts your default
   * @request PUT:/links/{playerTag}/default
   * @secure
   * @response `200` `SetDefaultLinkData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SetDefaultLink {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SetDefaultLinkData;
  }

  /**
   * @description ``` You can send either "playerTags" or "userIds", not both or none. Max size is 100. ```
   * @tags Links
   * @name GetLinks
   * @summary Get links by playerTags or userIds
   * @request QUERY:/links/query
   * @secure
   * @response `200` `GetLinksData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLinks {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GetLinksInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetLinksData;
  }

  /**
   * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
   * @tags Links
   * @name GetLinksViaPost
   * @summary Get links by playerTags or userIds
   * @request POST:/links/query
   * @deprecated
   * @secure
   * @response `200` `GetLinksViaPostData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLinksViaPost {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GetLinksInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetLinksViaPostData;
  }
}

export namespace Clans {
  /**
   * No description
   * @tags Clans
   * @name GetActivity
   * @request QUERY:/clans/activity
   * @secure
   * @response `200` `GetActivityData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetActivity {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ClanActivityInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetActivityData;
  }

  /**
   * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
   * @tags Clans
   * @name GetActivityViaPost
   * @request POST:/clans/activity
   * @deprecated
   * @secure
   * @response `200` `GetActivityViaPostData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetActivityViaPost {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ClanActivityInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetActivityViaPostData;
  }

  /**
   * No description
   * @tags Clans
   * @name GetClan
   * @request GET:/clans/{clanTag}
   * @secure
   * @response `200` `GetClanData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClan {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanData;
  }

  /**
   * No description
   * @tags Clans
   * @name GetLastSeen
   * @request GET:/clans/{clanTag}/lastseen
   * @secure
   * @response `200` `GetLastSeenData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLastSeen {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLastSeenData;
  }

  /**
   * No description
   * @tags Clans
   * @name GetCapitalContribution
   * @request GET:/clans/{clanTag}/capital-contribution
   * @secure
   * @response `200` `GetCapitalContributionData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetCapitalContribution {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {
      /**
       * @pattern ^\d{4}-\d{2}$
       * @example "2026-09"
       */
      season?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCapitalContributionData;
  }

  /**
   * No description
   * @tags Clans
   * @name GetCapitalRaids
   * @request GET:/clans/{clanTag}/capital-raids
   * @secure
   * @response `200` `GetCapitalRaidsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetCapitalRaids {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {
      /**
       * @min 1
       * @max 60
       * @default 5
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCapitalRaidsData;
  }

  /**
   * No description
   * @tags Clans
   * @name GetClanGames
   * @request GET:/clans/{clanTag}/clan-games
   * @secure
   * @response `200` `GetClanGamesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanGames {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {
      /**
       * `YYYY-MM`; defaults to the latest Clan Games (last month's until the 20th).
       * @pattern ^\d{4}-\d{2}$
       * @example "2026-10"
       */
      season?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanGamesData;
  }

  /**
   * No description
   * @tags Clans
   * @name GetClanLinks
   * @request GET:/clans/{clanTag}/links
   * @secure
   * @response `200` `GetClanLinksData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanLinks {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanLinksData;
  }
}

export namespace Players {
  /**
   * No description
   * @tags Players
   * @name GetPlayer
   * @request GET:/players/{playerTag}
   * @secure
   * @response `200` `GetPlayerData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetPlayer {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPlayerData;
  }

  /**
   * No description
   * @tags Players
   * @name AddPlayerAccount
   * @request PUT:/players/{playerTag}
   * @secure
   * @response `200` `AddPlayerAccountData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AddPlayerAccount {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AddPlayerAccountData;
  }

  /**
   * No description
   * @tags Players
   * @name GetSeasonStats
   * @request GET:/players/{playerTag}/seasons
   * @secure
   * @response `200` `GetSeasonStatsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetSeasonStats {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {
      /**
       * @min 1
       * @max 12
       * @default 2
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetSeasonStatsData;
  }

  /**
   * No description
   * @tags Players
   * @name GetRanked
   * @request GET:/players/{playerTag}/ranked
   * @secure
   * @response `200` `GetRankedData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetRanked {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetRankedData;
  }

  /**
   * No description
   * @tags Players
   * @name GetBattleLog
   * @request GET:/players/{playerTag}/battle-log
   * @secure
   * @response `200` `GetBattleLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetBattleLog {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetBattleLogData;
  }

  /**
   * No description
   * @tags Players
   * @name GetBattleLogAggregate
   * @request GET:/players/{playerTag}/battle-log/aggregate
   * @secure
   * @response `200` `GetBattleLogAggregateData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetBattleLogAggregate {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetBattleLogAggregateData;
  }

  /**
   * No description
   * @tags Players
   * @name GetBattleLogLeaderboard
   * @request QUERY:/players/battle-log/leaderboard
   * @secure
   * @response `200` `GetBattleLogLeaderboardData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetBattleLogLeaderboard {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BattleLogLeaderboardInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetBattleLogLeaderboardData;
  }

  /**
   * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
   * @tags Players
   * @name GetBattleLogLeaderboardViaPost
   * @request POST:/players/battle-log/leaderboard
   * @deprecated
   * @secure
   * @response `201` `GetBattleLogLeaderboardViaPostData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetBattleLogLeaderboardViaPost {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BattleLogLeaderboardInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetBattleLogLeaderboardViaPostData;
  }

  /**
   * No description
   * @tags Players
   * @name GetClanHistory
   * @request GET:/players/{playerTag}/history
   * @secure
   * @response `200` `GetClanHistoryData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanHistory {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanHistoryData;
  }

  /**
   * No description
   * @tags Players
   * @name GetAttackHistory
   * @request GET:/players/{playerTag}/wars
   * @secure
   * @response `200` `GetAttackHistoryData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetAttackHistory {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {
      /**
       * The newest wars first, at most this many.
       * @min 1
       * @max 100
       * @default 50
       */
      limit?: number;
      /**
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      startDate?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAttackHistoryData;
  }

  /**
   * No description
   * @tags Players
   * @name AggregateAttackHistory
   * @request GET:/players/{playerTag}/wars/aggregate
   * @secure
   * @response `200` `AggregateAttackHistoryData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AggregateAttackHistory {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {
      /**
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      startDate: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AggregateAttackHistoryData;
  }

  /**
   * No description
   * @tags Players
   * @name AggregateClanWarLeagueHistory
   * @request GET:/players/{playerTag}/clan-war-leagues/aggregate
   * @secure
   * @response `200` `AggregateClanWarLeagueHistoryData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AggregateClanWarLeagueHistory {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {
      /**
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      startDate: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AggregateClanWarLeagueHistoryData;
  }
}

export namespace Legends {
  /**
   * No description
   * @tags Legends
   * @name GetLegendRankingThresholds
   * @request GET:/legends/ranking-thresholds
   * @secure
   * @response `200` `GetLegendRankingThresholdsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLegendRankingThresholds {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLegendRankingThresholdsData;
  }

  /**
   * No description
   * @tags Legends
   * @name GetLegendAttacks
   * @request QUERY:/legends/attacks/query
   * @secure
   * @response `200` `GetLegendAttacksData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLegendAttacks {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GetLegendAttacksInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetLegendAttacksData;
  }

  /**
   * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
   * @tags Legends
   * @name GetLegendAttacksViaPost
   * @request POST:/legends/attacks/query
   * @deprecated
   * @secure
   * @response `200` `GetLegendAttacksViaPostData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLegendAttacksViaPost {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GetLegendAttacksInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetLegendAttacksViaPostData;
  }

  /**
   * No description
   * @tags Legends
   * @name GetLegendAttacksByPlayerTag
   * @request GET:/legends/{playerTag}/attacks
   * @secure
   * @response `200` `GetLegendAttacksByPlayerTagData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLegendAttacksByPlayerTag {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {
      /**
       * The league season's start date; the current season when left out.
       * @pattern ^\d{4}-\d{2}-\d{2}$
       * @example "2026-10-05"
       */
      seasonId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLegendAttacksByPlayerTagData;
  }

  /**
   * No description
   * @tags Legends
   * @name GetLegendSeasons
   * @request GET:/legends/{playerTag}/seasons
   * @secure
   * @response `200` `GetLegendSeasonsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLegendSeasons {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLegendSeasonsData;
  }

  /**
   * No description
   * @tags Legends
   * @name EstimateRank
   * @request GET:/legends/{playerTag}/estimate-rank
   * @secure
   * @response `200` `EstimateRankData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace EstimateRank {
    export type RequestParams = {
      playerTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = EstimateRankData;
  }
}

export namespace Wars {
  /**
   * No description
   * @tags Wars
   * @name GetClanWarLeagueGroups
   * @request GET:/wars/{clanTag}/clan-war-leagues/groups
   * @secure
   * @response `200` `GetClanWarLeagueGroupsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanWarLeagueGroups {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanWarLeagueGroupsData;
  }

  /**
   * No description
   * @tags Wars
   * @name GetClanWarLeagueForClan
   * @request GET:/wars/{clanTag}/clan-war-leagues/clan
   * @secure
   * @response `200` `GetClanWarLeagueForClanData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanWarLeagueForClan {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanWarLeagueForClanData;
  }

  /**
   * No description
   * @tags Wars
   * @name GetClanWarLeagueSeasons
   * @request GET:/wars/{clanTag}/clan-war-leagues/seasons
   * @secure
   * @response `200` `GetClanWarLeagueSeasonsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanWarLeagueSeasons {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {
      /**
       * @min 1
       * @max 12
       * @default 3
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanWarLeagueSeasonsData;
  }

  /**
   * No description
   * @tags Wars
   * @name GetClanWarStats
   * @request GET:/wars/{clanTag}/members/stats
   * @secure
   * @response `200` `GetClanWarStatsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanWarStats {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {
      /**
       * Regular and CWL wars, regular only, or CWL only; friendly wars never count.
       * @default "all"
       */
      type?: 'all' | 'regular' | 'cwl';
      /**
       * How many of the latest ended wars to count, for `all` and `regular`.
       * @min 1
       * @max 100
       * @default 25
       */
      wars?: number;
      /**
       * How many of the latest CWL seasons to count, for `cwl`.
       * @min 1
       * @max 12
       * @default 3
       */
      seasons?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanWarStatsData;
  }

  /**
   * No description
   * @tags Wars
   * @name GetClanWarLeagueStandings
   * @request GET:/wars/{clanTag}/clan-war-leagues/groups/{groupId}/standings
   * @secure
   * @response `200` `GetClanWarLeagueStandingsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanWarLeagueStandings {
    export type RequestParams = {
      clanTag: string;
      groupId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanWarLeagueStandingsData;
  }

  /**
   * No description
   * @tags Wars
   * @name GetClanWars
   * @request GET:/wars/{clanTag}
   * @secure
   * @response `200` `GetClanWarsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanWars {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {
      /**
       * @min 1
       * @max 50
       * @default 20
       */
      limit?: number;
      /**
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      before?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanWarsData;
  }

  /**
   * No description
   * @tags Wars
   * @name GetCurrentWar
   * @request GET:/wars/{clanTag}/current
   * @secure
   * @response `200` `GetCurrentWarData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetCurrentWar {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCurrentWarData;
  }

  /**
   * No description
   * @tags Wars
   * @name GetClanWar
   * @request GET:/wars/{clanTag}/{warId}
   * @secure
   * @response `200` `GetClanWarData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanWar {
    export type RequestParams = {
      clanTag: string;
      warId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanWarData;
  }
}

export namespace Events {
  /**
   * No description
   * @tags Events
   * @name GetEvents
   * @request GET:/events
   * @secure
   * @response `200` `GetEventsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetEvents {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      from: string;
      /**
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      to: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetEventsData;
  }

  /**
   * No description
   * @tags Events
   * @name GetUpcomingEvents
   * @request GET:/events/upcoming
   * @secure
   * @response `200` `GetUpcomingEventsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetUpcomingEvents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUpcomingEventsData;
  }
}

export namespace Rosters {
  /**
   * No description
   * @tags Rosters
   * @name GetRosters
   * @request GET:/rosters/{guildId}/list
   * @secure
   * @response `200` `GetRostersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetRosters {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetRostersData;
  }

  /**
   * No description
   * @tags Rosters
   * @name CreateRoster
   * @request POST:/rosters/{guildId}/create
   * @secure
   * @response `201` `CreateRosterData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateRoster {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RosterInput;
    export type RequestHeaders = {};
    export type ResponseBody = CreateRosterData;
  }

  /**
   * No description
   * @tags Rosters
   * @name CreateRosterGroup
   * @request POST:/rosters/{guildId}/groups
   * @secure
   * @response `201` `CreateRosterGroupData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateRosterGroup {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RosterGroupInput;
    export type RequestHeaders = {};
    export type ResponseBody = CreateRosterGroupData;
  }

  /**
   * No description
   * @tags Rosters
   * @name UpdateRosterGroup
   * @request PATCH:/rosters/{guildId}/groups/{groupId}
   * @secure
   * @response `200` `UpdateRosterGroupData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace UpdateRosterGroup {
    export type RequestParams = {
      guildId: string;
      groupId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RosterGroupUpdateInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateRosterGroupData;
  }

  /**
   * No description
   * @tags Rosters
   * @name DeleteRosterGroup
   * @request DELETE:/rosters/{guildId}/groups/{groupId}
   * @secure
   * @response `200` `DeleteRosterGroupData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteRosterGroup {
    export type RequestParams = {
      guildId: string;
      groupId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteRosterGroupData;
  }

  /**
   * No description
   * @tags Rosters
   * @name GetRoster
   * @request GET:/rosters/{guildId}/{rosterId}
   * @secure
   * @response `200` `GetRosterData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetRoster {
    export type RequestParams = {
      rosterId: string;
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetRosterData;
  }

  /**
   * No description
   * @tags Rosters
   * @name UpdateRoster
   * @request PATCH:/rosters/{guildId}/{rosterId}
   * @secure
   * @response `200` `UpdateRosterData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace UpdateRoster {
    export type RequestParams = {
      guildId: string;
      rosterId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RosterUpdateInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateRosterData;
  }

  /**
   * No description
   * @tags Rosters
   * @name DeleteRoster
   * @request DELETE:/rosters/{guildId}/{rosterId}
   * @secure
   * @response `204` `DeleteRosterData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteRoster {
    export type RequestParams = {
      guildId: string;
      rosterId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteRosterData;
  }

  /**
   * No description
   * @tags Rosters
   * @name CloneRoster
   * @request POST:/rosters/{guildId}/{rosterId}/clone
   * @secure
   * @response `201` `CloneRosterData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CloneRoster {
    export type RequestParams = {
      guildId: string;
      rosterId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = CloneRosterInput;
    export type RequestHeaders = {};
    export type ResponseBody = CloneRosterData;
  }

  /**
   * No description
   * @tags Rosters
   * @name CheckRosterMembers
   * @request QUERY:/rosters/{guildId}/{rosterId}/members/check
   * @secure
   * @response `200` `CheckRosterMembersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CheckRosterMembers {
    export type RequestParams = {
      guildId: string;
      rosterId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RosterTagsInput;
    export type RequestHeaders = {};
    export type ResponseBody = CheckRosterMembersData;
  }

  /**
   * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
   * @tags Rosters
   * @name CheckRosterMembersViaPost
   * @request POST:/rosters/{guildId}/{rosterId}/members/check
   * @deprecated
   * @secure
   * @response `200` `CheckRosterMembersViaPostData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CheckRosterMembersViaPost {
    export type RequestParams = {
      guildId: string;
      rosterId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RosterTagsInput;
    export type RequestHeaders = {};
    export type ResponseBody = CheckRosterMembersViaPostData;
  }

  /**
   * No description
   * @tags Rosters
   * @name AddRosterMembers
   * @request PUT:/rosters/{guildId}/{rosterId}/members
   * @secure
   * @response `200` `AddRosterMembersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AddRosterMembers {
    export type RequestParams = {
      guildId: string;
      rosterId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = AddRosterMembersInput;
    export type RequestHeaders = {};
    export type ResponseBody = AddRosterMembersData;
  }

  /**
   * No description
   * @tags Rosters
   * @name DeleteRosterMembers
   * @request DELETE:/rosters/{guildId}/{rosterId}/members
   * @secure
   * @response `200` `DeleteRosterMembersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteRosterMembers {
    export type RequestParams = {
      rosterId: string;
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RemoveMembersBulkInput;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteRosterMembersData;
  }

  /**
   * No description
   * @tags Rosters
   * @name RefreshRosterMembers
   * @request POST:/rosters/{guildId}/{rosterId}/members/refresh
   * @secure
   * @response `201` `RefreshRosterMembersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace RefreshRosterMembers {
    export type RequestParams = {
      guildId: string;
      rosterId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RefreshRosterMembersData;
  }

  /**
   * No description
   * @tags Rosters
   * @name TransferRosterMembers
   * @request PUT:/rosters/{guildId}/{rosterId}/members/transfer
   * @secure
   * @response `200` `TransferRosterMembersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace TransferRosterMembers {
    export type RequestParams = {
      rosterId: string;
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = TransferRosterMembersInput;
    export type RequestHeaders = {};
    export type ResponseBody = TransferRosterMembersData;
  }
}

export namespace Users {
  /**
   * No description
   * @tags Users
   * @name GetUserSettings
   * @request GET:/users/me
   * @secure
   * @response `200` `GetUserSettingsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetUserSettings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserSettingsData;
  }

  /**
   * No description
   * @tags Users
   * @name SetDefaultClan
   * @request PUT:/users/me/clan
   * @secure
   * @response `200` `SetDefaultClanData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SetDefaultClan {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ClanTagInput;
    export type RequestHeaders = {};
    export type ResponseBody = SetDefaultClanData;
  }

  /**
   * No description
   * @tags Users
   * @name ClearDefaultClan
   * @request DELETE:/users/me/clan
   * @secure
   * @response `200` `ClearDefaultClanData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ClearDefaultClan {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ClearDefaultClanData;
  }

  /**
   * No description
   * @tags Users
   * @name AddBookmark
   * @request POST:/users/me/bookmarks
   * @secure
   * @response `201` `AddBookmarkData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AddBookmark {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ClanTagInput;
    export type RequestHeaders = {};
    export type ResponseBody = AddBookmarkData;
  }

  /**
   * No description
   * @tags Users
   * @name RemoveBookmark
   * @request DELETE:/users/me/bookmarks/{clanTag}
   * @secure
   * @response `200` `RemoveBookmarkData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace RemoveBookmark {
    export type RequestParams = {
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RemoveBookmarkData;
  }

  /**
   * No description
   * @tags Users
   * @name SetTimezone
   * @request PUT:/users/me/timezone
   * @secure
   * @response `200` `SetTimezoneData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SetTimezone {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TimezoneInput;
    export type RequestHeaders = {};
    export type ResponseBody = SetTimezoneData;
  }

  /**
   * No description
   * @tags Users
   * @name ClearTimezone
   * @request DELETE:/users/me/timezone
   * @secure
   * @response `200` `ClearTimezoneData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ClearTimezone {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ClearTimezoneData;
  }
}

export namespace Guilds {
  /**
   * No description
   * @tags Guilds
   * @name GetGuildClans
   * @request GET:/guilds/{guildId}/clans
   * @secure
   * @response `200` `GetGuildClansData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetGuildClans {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetGuildClansData;
  }

  /**
   * No description
   * @tags Guilds
   * @name AddGuildClan
   * @request POST:/guilds/{guildId}/clans
   * @secure
   * @response `201` `AddGuildClanData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AddGuildClan {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = AddGuildClanInput;
    export type RequestHeaders = {};
    export type ResponseBody = AddGuildClanData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ReorderGuildClans
   * @request PATCH:/guilds/{guildId}/clans/reorder
   * @secure
   * @response `200` `ReorderGuildClansData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ReorderGuildClans {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ReorderClanCategoriesInput;
    export type RequestHeaders = {};
    export type ResponseBody = ReorderGuildClansData;
  }

  /**
   * No description
   * @tags Guilds
   * @name RemoveGuildClan
   * @request DELETE:/guilds/{guildId}/clans/{clanTag}
   * @secure
   * @response `200` `RemoveGuildClanData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace RemoveGuildClan {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RemoveGuildClanData;
  }

  /**
   * No description
   * @tags Guilds
   * @name UpdateGuildClan
   * @request PATCH:/guilds/{guildId}/clans/{clanTag}
   * @secure
   * @response `200` `UpdateGuildClanData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace UpdateGuildClan {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanSettingsInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateGuildClanData;
  }

  /**
   * No description
   * @tags Guilds
   * @name CreateClanCategory
   * @request POST:/guilds/{guildId}/categories
   * @secure
   * @response `201` `CreateClanCategoryData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateClanCategory {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanCategoryInput;
    export type RequestHeaders = {};
    export type ResponseBody = CreateClanCategoryData;
  }

  /**
   * No description
   * @tags Guilds
   * @name RenameClanCategory
   * @request PATCH:/guilds/{guildId}/categories/{categoryId}
   * @secure
   * @response `200` `RenameClanCategoryData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace RenameClanCategory {
    export type RequestParams = {
      guildId: string;
      categoryId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanCategoryInput;
    export type RequestHeaders = {};
    export type ResponseBody = RenameClanCategoryData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteClanCategory
   * @request DELETE:/guilds/{guildId}/categories/{categoryId}
   * @secure
   * @response `200` `DeleteClanCategoryData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteClanCategory {
    export type RequestParams = {
      guildId: string;
      categoryId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteClanCategoryData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetGuildReminders
   * @request GET:/guilds/{guildId}/reminders
   * @secure
   * @response `200` `GetGuildRemindersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetGuildReminders {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetGuildRemindersData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ListChannels
   * @request GET:/guilds/{guildId}/channels
   * @secure
   * @response `200` `ListChannelsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListChannels {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListChannelsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ListRoles
   * @request GET:/guilds/{guildId}/roles
   * @secure
   * @response `200` `ListRolesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListRoles {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListRolesData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetReminderPings
   * @request GET:/guilds/{guildId}/reminders/pings
   * @secure
   * @response `200` `GetReminderPingsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetReminderPings {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetReminderPingsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveReminderPings
   * @request PUT:/guilds/{guildId}/reminders/pings
   * @secure
   * @response `200` `SaveReminderPingsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveReminderPings {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ReminderPingsInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveReminderPingsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name CreateClanWarReminder
   * @request POST:/guilds/{guildId}/reminders/clan-wars
   * @secure
   * @response `201` `CreateClanWarReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateClanWarReminder {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanWarReminderInput;
    export type RequestHeaders = {};
    export type ResponseBody = CreateClanWarReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name UpdateClanWarReminder
   * @request PUT:/guilds/{guildId}/reminders/clan-wars/{reminderId}
   * @secure
   * @response `200` `UpdateClanWarReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace UpdateClanWarReminder {
    export type RequestParams = {
      guildId: string;
      reminderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanWarReminderInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateClanWarReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteClanWarReminder
   * @request DELETE:/guilds/{guildId}/reminders/clan-wars/{reminderId}
   * @secure
   * @response `204` `DeleteClanWarReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteClanWarReminder {
    export type RequestParams = {
      guildId: string;
      reminderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteClanWarReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name CreateCapitalRaidReminder
   * @request POST:/guilds/{guildId}/reminders/capital-raids
   * @secure
   * @response `201` `CreateCapitalRaidReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateCapitalRaidReminder {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = CapitalRaidReminderInput;
    export type RequestHeaders = {};
    export type ResponseBody = CreateCapitalRaidReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name UpdateCapitalRaidReminder
   * @request PUT:/guilds/{guildId}/reminders/capital-raids/{reminderId}
   * @secure
   * @response `200` `UpdateCapitalRaidReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace UpdateCapitalRaidReminder {
    export type RequestParams = {
      guildId: string;
      reminderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = CapitalRaidReminderInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateCapitalRaidReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteCapitalRaidReminder
   * @request DELETE:/guilds/{guildId}/reminders/capital-raids/{reminderId}
   * @secure
   * @response `204` `DeleteCapitalRaidReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteCapitalRaidReminder {
    export type RequestParams = {
      guildId: string;
      reminderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteCapitalRaidReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name CreateClanGamesReminder
   * @request POST:/guilds/{guildId}/reminders/clan-games
   * @secure
   * @response `201` `CreateClanGamesReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateClanGamesReminder {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanGamesReminderInput;
    export type RequestHeaders = {};
    export type ResponseBody = CreateClanGamesReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name UpdateClanGamesReminder
   * @request PUT:/guilds/{guildId}/reminders/clan-games/{reminderId}
   * @secure
   * @response `200` `UpdateClanGamesReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace UpdateClanGamesReminder {
    export type RequestParams = {
      guildId: string;
      reminderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanGamesReminderInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateClanGamesReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteClanGamesReminder
   * @request DELETE:/guilds/{guildId}/reminders/clan-games/{reminderId}
   * @secure
   * @response `204` `DeleteClanGamesReminderData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteClanGamesReminder {
    export type RequestParams = {
      guildId: string;
      reminderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteClanGamesReminderData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ListGuildClanLogs
   * @request GET:/guilds/{guildId}/clan-logs
   * @secure
   * @response `200` `ListGuildClanLogsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListGuildClanLogs {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListGuildClanLogsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetClanLogLimit
   * @request GET:/guilds/{guildId}/clan-logs/limit
   * @secure
   * @response `200` `GetClanLogLimitData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanLogLimit {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanLogLimitData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetClanEmbed
   * @request GET:/guilds/{guildId}/clans/{clanTag}/embed
   * @secure
   * @response `200` `GetClanEmbedData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetClanEmbed {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClanEmbedData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveClanEmbed
   * @request PUT:/guilds/{guildId}/clans/{clanTag}/embed
   * @secure
   * @response `200` `SaveClanEmbedData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveClanEmbed {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanEmbedInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveClanEmbedData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteClanEmbed
   * @request DELETE:/guilds/{guildId}/clans/{clanTag}/embed
   * @secure
   * @response `204` `DeleteClanEmbedData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteClanEmbed {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteClanEmbedData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ListClanLogs
   * @request GET:/guilds/{guildId}/clans/{clanTag}/logs
   * @secure
   * @response `200` `ListClanLogsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListClanLogs {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListClanLogsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveClanLog
   * @request PUT:/guilds/{guildId}/clans/{clanTag}/logs/{logType}
   * @secure
   * @response `200` `SaveClanLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveClanLog {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
      logType: ClanLogType;
    };
    export type RequestQuery = {};
    export type RequestBody = ClanLogInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveClanLogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteClanLog
   * @request DELETE:/guilds/{guildId}/clans/{clanTag}/logs/{logType}
   * @secure
   * @response `204` `DeleteClanLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteClanLog {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
      logType: ClanLogType;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteClanLogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetAutoRoles
   * @request GET:/guilds/{guildId}/auto-roles
   * @secure
   * @response `200` `GetAutoRolesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetAutoRoles {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAutoRolesData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveAutoRoles
   * @request PATCH:/guilds/{guildId}/auto-roles
   * @secure
   * @response `200` `SaveAutoRolesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveAutoRoles {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = AutoRolesInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveAutoRolesData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveClanAutoRoles
   * @request PUT:/guilds/{guildId}/auto-roles/clans/{clanTag}
   * @secure
   * @response `200` `SaveClanAutoRolesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveClanAutoRoles {
    export type RequestParams = {
      guildId: string;
      clanTag: string;
    };
    export type RequestQuery = {};
    export type RequestBody = AutoRoleClanInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveClanAutoRolesData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ListFlags
   * @request GET:/guilds/{guildId}/flags
   * @secure
   * @response `200` `ListFlagsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListFlags {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {
      flagType?: FlagType;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListFlagsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name CreateFlags
   * @request POST:/guilds/{guildId}/flags
   * @secure
   * @response `201` `CreateFlagsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateFlags {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = FlagInput;
    export type RequestHeaders = {};
    export type ResponseBody = CreateFlagsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteFlag
   * @request DELETE:/guilds/{guildId}/flags/{flagId}
   * @secure
   * @response `204` `DeleteFlagData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteFlag {
    export type RequestParams = {
      guildId: string;
      flagId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteFlagData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ListMembers
   * @request GET:/guilds/{guildId}/members/list
   * @secure
   * @response `200` `ListMembersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListMembers {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {
      query: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListMembersData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetServerLogs
   * @request GET:/guilds/{guildId}/server-logs
   * @secure
   * @response `200` `GetServerLogsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetServerLogs {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetServerLogsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveFlagAlertLog
   * @request PUT:/guilds/{guildId}/server-logs/flag-alert
   * @secure
   * @response `200` `SaveFlagAlertLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveFlagAlertLog {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = FlagAlertLogInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveFlagAlertLogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteFlagAlertLog
   * @request DELETE:/guilds/{guildId}/server-logs/flag-alert
   * @secure
   * @response `200` `DeleteFlagAlertLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteFlagAlertLog {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteFlagAlertLogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveRosterChangelog
   * @request PUT:/guilds/{guildId}/server-logs/roster-changelog
   * @secure
   * @response `200` `SaveRosterChangelogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveRosterChangelog {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ServerLogChannelInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveRosterChangelogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteRosterChangelog
   * @request DELETE:/guilds/{guildId}/server-logs/roster-changelog
   * @secure
   * @response `200` `DeleteRosterChangelogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteRosterChangelog {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteRosterChangelogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveMaintenanceLog
   * @request PUT:/guilds/{guildId}/server-logs/maintenance
   * @secure
   * @response `200` `SaveMaintenanceLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveMaintenanceLog {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = MaintenanceLogInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveMaintenanceLogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteMaintenanceLog
   * @request DELETE:/guilds/{guildId}/server-logs/maintenance
   * @secure
   * @response `200` `DeleteMaintenanceLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteMaintenanceLog {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteMaintenanceLogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveWelcomeLog
   * @request PUT:/guilds/{guildId}/server-logs/welcome
   * @secure
   * @response `200` `SaveWelcomeLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveWelcomeLog {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = WelcomeLogInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveWelcomeLogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteWelcomeLog
   * @summary Turns the welcome message off but keeps it, as `/setup server-logs disable` does.
   * @request DELETE:/guilds/{guildId}/server-logs/welcome
   * @secure
   * @response `200` `DeleteWelcomeLogData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteWelcomeLog {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteWelcomeLogData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetButtons
   * @request GET:/guilds/{guildId}/buttons
   * @secure
   * @response `200` `GetButtonsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetButtons {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetButtonsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveButton
   * @summary Saves what `/setup buttons` posts; messages already posted keep their old look.
   * @request PUT:/guilds/{guildId}/buttons/{buttonType}
   * @secure
   * @response `200` `SaveButtonData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveButton {
    export type RequestParams = {
      guildId: string;
      buttonType: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ButtonMessageInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveButtonData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetManagerRoles
   * @request GET:/guilds/{guildId}/managers
   * @secure
   * @response `200` `GetManagerRolesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetManagerRoles {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetManagerRolesData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveManagerRoles
   * @request PATCH:/guilds/{guildId}/managers
   * @secure
   * @response `200` `SaveManagerRolesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveManagerRoles {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ManagerRolesInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveManagerRolesData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetConfig
   * @request GET:/guilds/{guildId}/config
   * @secure
   * @response `200` `GetConfigData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetConfig {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetConfigData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveConfig
   * @request PATCH:/guilds/{guildId}/config
   * @secure
   * @response `200` `SaveConfigData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveConfig {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ServerConfigInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveConfigData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetGuildBeta
   * @request GET:/guilds/{guildId}/beta
   * @secure
   * @response `200` `GetGuildBetaData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetGuildBeta {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetGuildBetaData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ListCategories
   * @request GET:/guilds/{guildId}/channel-categories
   * @secure
   * @response `200` `ListCategoriesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListCategories {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListCategoriesData;
  }

  /**
   * No description
   * @tags Guilds
   * @name GetTickets
   * @request GET:/guilds/{guildId}/tickets
   * @secure
   * @response `200` `GetTicketsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetTickets {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTicketsData;
  }

  /**
   * No description
   * @tags Guilds
   * @name CreateTicketPanel
   * @request POST:/guilds/{guildId}/tickets/panels
   * @secure
   * @response `201` `CreateTicketPanelData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace CreateTicketPanel {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = CreateTicketPanelInput;
    export type RequestHeaders = {};
    export type ResponseBody = CreateTicketPanelData;
  }

  /**
   * No description
   * @tags Guilds
   * @name UpdateTicketPanel
   * @request PATCH:/guilds/{guildId}/tickets/panels/{panelId}
   * @secure
   * @response `200` `UpdateTicketPanelData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace UpdateTicketPanel {
    export type RequestParams = {
      guildId: string;
      panelId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = TicketPanelInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateTicketPanelData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteTicketPanel
   * @request DELETE:/guilds/{guildId}/tickets/panels/{panelId}
   * @secure
   * @response `200` `DeleteTicketPanelData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteTicketPanel {
    export type RequestParams = {
      guildId: string;
      panelId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTicketPanelData;
  }

  /**
   * No description
   * @tags Guilds
   * @name AddTicketType
   * @request POST:/guilds/{guildId}/tickets/panels/{panelId}/types
   * @secure
   * @response `201` `AddTicketTypeData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AddTicketType {
    export type RequestParams = {
      guildId: string;
      panelId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = CreateTicketTypeInput;
    export type RequestHeaders = {};
    export type ResponseBody = AddTicketTypeData;
  }

  /**
   * No description
   * @tags Guilds
   * @name ReorderTicketTypes
   * @request PUT:/guilds/{guildId}/tickets/panels/{panelId}/types/order
   * @secure
   * @response `200` `ReorderTicketTypesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ReorderTicketTypes {
    export type RequestParams = {
      guildId: string;
      panelId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ReorderTicketTypesInput;
    export type RequestHeaders = {};
    export type ResponseBody = ReorderTicketTypesData;
  }

  /**
   * No description
   * @tags Guilds
   * @name UpdateTicketType
   * @request PATCH:/guilds/{guildId}/tickets/panels/{panelId}/types/{typeId}
   * @secure
   * @response `200` `UpdateTicketTypeData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace UpdateTicketType {
    export type RequestParams = {
      guildId: string;
      panelId: string;
      typeId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = TicketTypeInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateTicketTypeData;
  }

  /**
   * No description
   * @tags Guilds
   * @name DeleteTicketType
   * @request DELETE:/guilds/{guildId}/tickets/panels/{panelId}/types/{typeId}
   * @secure
   * @response `200` `DeleteTicketTypeData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteTicketType {
    export type RequestParams = {
      guildId: string;
      panelId: string;
      typeId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTicketTypeData;
  }

  /**
   * No description
   * @tags Guilds
   * @name SaveTicketReplies
   * @request PUT:/guilds/{guildId}/tickets/saved-replies
   * @secure
   * @response `200` `SaveTicketRepliesData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace SaveTicketReplies {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = TicketSavedRepliesInput;
    export type RequestHeaders = {};
    export type ResponseBody = SaveTicketRepliesData;
  }
}

export namespace Exports {
  /**
   * No description
   * @tags Internal
   * @name ExportClanMembers
   * @request POST:/exports/members
   * @response `201` `ExportClanMembersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ExportClanMembers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ExportMembersInput;
    export type RequestHeaders = {};
    export type ResponseBody = ExportClanMembersData;
  }
}

export namespace Admin {
  /**
   * No description
   * @tags Admin
   * @name ListBetaGuilds
   * @request GET:/admin/beta-guilds
   * @secure
   * @response `200` `ListBetaGuildsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListBetaGuilds {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListBetaGuildsData;
  }

  /**
   * No description
   * @tags Admin
   * @name AddBetaGuilds
   * @request POST:/admin/beta-guilds
   * @secure
   * @response `201` `AddBetaGuildsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AddBetaGuilds {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AddBetaGuildsInput;
    export type RequestHeaders = {};
    export type ResponseBody = AddBetaGuildsData;
  }

  /**
   * No description
   * @tags Admin
   * @name RemoveBetaGuild
   * @request DELETE:/admin/beta-guilds/{guildId}
   * @secure
   * @response `200` `RemoveBetaGuildData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace RemoveBetaGuild {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RemoveBetaGuildData;
  }

  /**
   * No description
   * @tags Admin
   * @name ListSubscribers
   * @request GET:/admin/subscribers
   * @secure
   * @response `200` `ListSubscribersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListSubscribers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListSubscribersData;
  }

  /**
   * No description
   * @tags Admin
   * @name ListDevelopers
   * @request GET:/admin/developers
   * @secure
   * @response `200` `ListDevelopersData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListDevelopers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListDevelopersData;
  }

  /**
   * No description
   * @tags Admin
   * @name AddDeveloper
   * @request POST:/admin/developers
   * @secure
   * @response `201` `AddDeveloperData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace AddDeveloper {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AddDeveloperInput;
    export type RequestHeaders = {};
    export type ResponseBody = AddDeveloperData;
  }

  /**
   * No description
   * @tags Admin
   * @name EditDeveloper
   * @request PATCH:/admin/developers/{userId}
   * @secure
   * @response `200` `EditDeveloperData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace EditDeveloper {
    export type RequestParams = {
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = EditDeveloperInput;
    export type RequestHeaders = {};
    export type ResponseBody = EditDeveloperData;
  }

  /**
   * No description
   * @tags Admin
   * @name RevokeDeveloper
   * @request DELETE:/admin/developers/{userId}
   * @secure
   * @response `200` `RevokeDeveloperData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace RevokeDeveloper {
    export type RequestParams = {
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RevokeDeveloperData;
  }
}

export namespace BetaGuilds {
  /**
   * No description
   * @tags Internal
   * @name ListBetaGuildIds
   * @request GET:/beta-guilds/ids
   * @secure
   * @response `200` `ListBetaGuildIdsData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace ListBetaGuildIds {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListBetaGuildIdsData;
  }
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType
} from 'axios';
import axios from 'axios';

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams extends Omit<
  AxiosRequestConfig,
  'data' | 'params' | 'url' | 'responseType'
> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;

export interface ApiConfig<SecurityDataType = unknown> extends Omit<
  AxiosRequestConfig,
  'data' | 'cancelToken'
> {
  securityWorker?: (
    securityData: SecurityDataType | null
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = 'application/json',
  JsonApi = 'application/vnd.api+json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain'
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker'];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || '/v1'
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[method.toLowerCase() as keyof HeadersDefaults]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {})
      }
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === 'object' && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] = property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (type === ContentType.FormData && body && body !== null && typeof body === 'object') {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (type === ContentType.Text && body && body !== null && typeof body !== 'string') {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { 'Content-Type': type } : {})
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path
    });
  };
}

/**
 * @title ClashPerk Discord Bot API
 * @version v2.0.90
 * @baseUrl /v1
 * @contact
 *
 * ### API Routes for ClashPerk Discord Bot and Services
 *
 * [Terms of Service](https://clashperk.com/terms) | [Privacy Policy](https://clashperk.com/privacy)
 */
export class Api<SecurityDataType extends unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  auth = {
    /**
     * @description Authenticates a user using a `passKey` and returns an `accessToken` with a limited validity period (2 hours). Once the token expires, a new token must be generated.<br/><br/>The `accessToken` must be included in all protected API requests using the following header `Authorization: Bearer <accessToken>`
     *
     * @tags Auth
     * @name Login
     * @summary Authenticate with your passKey to receive an accessToken required for authorized API requests.
     * @request POST:/auth/login
     * @response `201` `LoginData`
     * @response `500` `ErrorResponseDto`
     */
    login: (data: LoginInputDto, params: RequestParams = {}) =>
      this.http.request<LoginData, LoginError>({
        path: `/auth/login`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GeneratePasskey
     * @summary Generate a passKey required for authentication.
     * @request POST:/auth/generate-passkey
     * @secure
     * @response `201` `GeneratePasskeyData`
     * @response `500` `ErrorResponseDto`
     */
    generatePasskey: (data: GenerateTokenInputDto, params: RequestParams = {}) =>
      this.http.request<GeneratePasskeyData, GeneratePasskeyError>({
        path: `/auth/generate-passkey`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GetAuthUser
     * @request GET:/auth/users/{userId}
     * @secure
     * @response `200` `GetAuthUserData`
     * @response `500` `ErrorResponseDto`
     */
    getAuthUser: ({ userId }: GetAuthUserParams, params: RequestParams = {}) =>
      this.http.request<GetAuthUserData, GetAuthUserError>({
        path: `/auth/users/${userId}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name DecodeHandoffToken
     * @request GET:/auth/handoff/{token}
     * @secure
     * @response `200` `DecodeHandoffTokenData`
     * @response `500` `ErrorResponseDto`
     */
    decodeHandoffToken: ({ token }: DecodeHandoffTokenParams, params: RequestParams = {}) =>
      this.http.request<DecodeHandoffTokenData, DecodeHandoffTokenError>({
        path: `/auth/handoff/${token}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name CreateHandoffToken
     * @request POST:/auth/handoff
     * @secure
     * @response `201` `CreateHandoffTokenData`
     * @response `500` `ErrorResponseDto`
     */
    createHandoffToken: (data: HandoffTokenInputDto, params: RequestParams = {}) =>
      this.http.request<CreateHandoffTokenData, CreateHandoffTokenError>({
        path: `/auth/handoff`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GetBotGuilds
     * @request QUERY:/auth/bot-guilds
     * @secure
     * @response `200` `GetBotGuildsData`
     * @response `500` `ErrorResponseDto`
     */
    getBotGuilds: (data: BotGuildsInputDto, params: RequestParams = {}) =>
      this.http.request<GetBotGuildsData, GetBotGuildsError>({
        path: `/auth/bot-guilds`,
        method: 'QUERY',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
     *
     * @tags Auth
     * @name GetBotGuildsViaPost
     * @request POST:/auth/bot-guilds
     * @deprecated
     * @secure
     * @response `200` `GetBotGuildsViaPostData`
     * @response `500` `ErrorResponseDto`
     */
    getBotGuildsViaPost: (data: BotGuildsInputDto, params: RequestParams = {}) =>
      this.http.request<GetBotGuildsViaPostData, GetBotGuildsViaPostError>({
        path: `/auth/bot-guilds`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GetManagedGuilds
     * @request QUERY:/auth/managed-guilds
     * @secure
     * @response `200` `GetManagedGuildsData`
     * @response `500` `ErrorResponseDto`
     */
    getManagedGuilds: (data: ManagedGuildsInputDto, params: RequestParams = {}) =>
      this.http.request<GetManagedGuildsData, GetManagedGuildsError>({
        path: `/auth/managed-guilds`,
        method: 'QUERY',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
     *
     * @tags Auth
     * @name GetManagedGuildsViaPost
     * @request POST:/auth/managed-guilds
     * @deprecated
     * @secure
     * @response `200` `GetManagedGuildsViaPostData`
     * @response `500` `ErrorResponseDto`
     */
    getManagedGuildsViaPost: (data: ManagedGuildsInputDto, params: RequestParams = {}) =>
      this.http.request<GetManagedGuildsViaPostData, GetManagedGuildsViaPostError>({
        path: `/auth/managed-guilds`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GetGuildAccess
     * @request QUERY:/auth/guild-access
     * @secure
     * @response `200` `GetGuildAccessData`
     * @response `500` `ErrorResponseDto`
     */
    getGuildAccess: (data: GuildAccessInputDto, params: RequestParams = {}) =>
      this.http.request<GetGuildAccessData, GetGuildAccessError>({
        path: `/auth/guild-access`,
        method: 'QUERY',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
     *
     * @tags Auth
     * @name GetGuildAccessViaPost
     * @request POST:/auth/guild-access
     * @deprecated
     * @secure
     * @response `200` `GetGuildAccessViaPostData`
     * @response `500` `ErrorResponseDto`
     */
    getGuildAccessViaPost: (data: GuildAccessInputDto, params: RequestParams = {}) =>
      this.http.request<GetGuildAccessViaPostData, GetGuildAccessViaPostError>({
        path: `/auth/guild-access`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      })
  };
  links = {
    /**
     * No description
     *
     * @tags Links
     * @name Link
     * @request POST:/links
     * @secure
     * @response `201` `LinkData`
     * @response `500` `ErrorResponseDto`
     */
    link: (data: CreateLinkInputDto, params: RequestParams = {}) =>
      this.http.request<LinkData, LinkError>({
        path: `/links`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Links
     * @name Unlink
     * @request DELETE:/links/{playerTag}
     * @secure
     * @response `200` `UnlinkData`
     * @response `500` `ErrorResponseDto`
     */
    unlink: ({ playerTag }: UnlinkParams, params: RequestParams = {}) =>
      this.http.request<UnlinkData, UnlinkError>({
        path: `/links/${playerTag}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Links
     * @name SetDefaultLink
     * @summary Make one of your own linked accounts your default
     * @request PUT:/links/{playerTag}/default
     * @secure
     * @response `200` `SetDefaultLinkData`
     * @response `500` `ErrorResponseDto`
     */
    setDefaultLink: ({ playerTag }: SetDefaultLinkParams, params: RequestParams = {}) =>
      this.http.request<SetDefaultLinkData, SetDefaultLinkError>({
        path: `/links/${playerTag}/default`,
        method: 'PUT',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * @description ``` You can send either "playerTags" or "userIds", not both or none. Max size is 100. ```
     *
     * @tags Links
     * @name GetLinks
     * @summary Get links by playerTags or userIds
     * @request QUERY:/links/query
     * @secure
     * @response `200` `GetLinksData`
     * @response `500` `ErrorResponseDto`
     */
    getLinks: (data: GetLinksInputDto, params: RequestParams = {}) =>
      this.http.request<GetLinksData, GetLinksError>({
        path: `/links/query`,
        method: 'QUERY',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
     *
     * @tags Links
     * @name GetLinksViaPost
     * @summary Get links by playerTags or userIds
     * @request POST:/links/query
     * @deprecated
     * @secure
     * @response `200` `GetLinksViaPostData`
     * @response `500` `ErrorResponseDto`
     */
    getLinksViaPost: (data: GetLinksInputDto, params: RequestParams = {}) =>
      this.http.request<GetLinksViaPostData, GetLinksViaPostError>({
        path: `/links/query`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      })
  };
  clans = {
    /**
     * No description
     *
     * @tags Clans
     * @name GetActivity
     * @request QUERY:/clans/activity
     * @secure
     * @response `200` `GetActivityData`
     * @response `500` `ErrorResponseDto`
     */
    getActivity: (data: ClanActivityInputDto, params: RequestParams = {}) =>
      this.http.request<GetActivityData, GetActivityError>({
        path: `/clans/activity`,
        method: 'QUERY',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
     *
     * @tags Clans
     * @name GetActivityViaPost
     * @request POST:/clans/activity
     * @deprecated
     * @secure
     * @response `200` `GetActivityViaPostData`
     * @response `500` `ErrorResponseDto`
     */
    getActivityViaPost: (data: ClanActivityInputDto, params: RequestParams = {}) =>
      this.http.request<GetActivityViaPostData, GetActivityViaPostError>({
        path: `/clans/activity`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Clans
     * @name GetClan
     * @request GET:/clans/{clanTag}
     * @secure
     * @response `200` `GetClanData`
     * @response `500` `ErrorResponseDto`
     */
    getClan: ({ clanTag }: GetClanParams, params: RequestParams = {}) =>
      this.http.request<GetClanData, GetClanError>({
        path: `/clans/${clanTag}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Clans
     * @name GetLastSeen
     * @request GET:/clans/{clanTag}/lastseen
     * @secure
     * @response `200` `GetLastSeenData`
     * @response `500` `ErrorResponseDto`
     */
    getLastSeen: ({ clanTag }: GetLastSeenParams, params: RequestParams = {}) =>
      this.http.request<GetLastSeenData, GetLastSeenError>({
        path: `/clans/${clanTag}/lastseen`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Clans
     * @name GetCapitalContribution
     * @request GET:/clans/{clanTag}/capital-contribution
     * @secure
     * @response `200` `GetCapitalContributionData`
     * @response `500` `ErrorResponseDto`
     */
    getCapitalContribution: (
      { clanTag, ...query }: GetCapitalContributionParams,
      params: RequestParams = {}
    ) =>
      this.http.request<GetCapitalContributionData, GetCapitalContributionError>({
        path: `/clans/${clanTag}/capital-contribution`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Clans
     * @name GetCapitalRaids
     * @request GET:/clans/{clanTag}/capital-raids
     * @secure
     * @response `200` `GetCapitalRaidsData`
     * @response `500` `ErrorResponseDto`
     */
    getCapitalRaids: ({ clanTag, ...query }: GetCapitalRaidsParams, params: RequestParams = {}) =>
      this.http.request<GetCapitalRaidsData, GetCapitalRaidsError>({
        path: `/clans/${clanTag}/capital-raids`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Clans
     * @name GetClanGames
     * @request GET:/clans/{clanTag}/clan-games
     * @secure
     * @response `200` `GetClanGamesData`
     * @response `500` `ErrorResponseDto`
     */
    getClanGames: ({ clanTag, ...query }: GetClanGamesParams, params: RequestParams = {}) =>
      this.http.request<GetClanGamesData, GetClanGamesError>({
        path: `/clans/${clanTag}/clan-games`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Clans
     * @name GetClanLinks
     * @request GET:/clans/{clanTag}/links
     * @secure
     * @response `200` `GetClanLinksData`
     * @response `500` `ErrorResponseDto`
     */
    getClanLinks: ({ clanTag }: GetClanLinksParams, params: RequestParams = {}) =>
      this.http.request<GetClanLinksData, GetClanLinksError>({
        path: `/clans/${clanTag}/links`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      })
  };
  players = {
    /**
     * No description
     *
     * @tags Players
     * @name GetPlayer
     * @request GET:/players/{playerTag}
     * @secure
     * @response `200` `GetPlayerData`
     * @response `500` `ErrorResponseDto`
     */
    getPlayer: ({ playerTag }: GetPlayerParams, params: RequestParams = {}) =>
      this.http.request<GetPlayerData, GetPlayerError>({
        path: `/players/${playerTag}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name AddPlayerAccount
     * @request PUT:/players/{playerTag}
     * @secure
     * @response `200` `AddPlayerAccountData`
     * @response `500` `ErrorResponseDto`
     */
    addPlayerAccount: ({ playerTag }: AddPlayerAccountParams, params: RequestParams = {}) =>
      this.http.request<AddPlayerAccountData, AddPlayerAccountError>({
        path: `/players/${playerTag}`,
        method: 'PUT',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name GetSeasonStats
     * @request GET:/players/{playerTag}/seasons
     * @secure
     * @response `200` `GetSeasonStatsData`
     * @response `500` `ErrorResponseDto`
     */
    getSeasonStats: ({ playerTag, ...query }: GetSeasonStatsParams, params: RequestParams = {}) =>
      this.http.request<GetSeasonStatsData, GetSeasonStatsError>({
        path: `/players/${playerTag}/seasons`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name GetRanked
     * @request GET:/players/{playerTag}/ranked
     * @secure
     * @response `200` `GetRankedData`
     * @response `500` `ErrorResponseDto`
     */
    getRanked: ({ playerTag }: GetRankedParams, params: RequestParams = {}) =>
      this.http.request<GetRankedData, GetRankedError>({
        path: `/players/${playerTag}/ranked`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name GetBattleLog
     * @request GET:/players/{playerTag}/battle-log
     * @secure
     * @response `200` `GetBattleLogData`
     * @response `500` `ErrorResponseDto`
     */
    getBattleLog: ({ playerTag }: GetBattleLogParams, params: RequestParams = {}) =>
      this.http.request<GetBattleLogData, GetBattleLogError>({
        path: `/players/${playerTag}/battle-log`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name GetBattleLogAggregate
     * @request GET:/players/{playerTag}/battle-log/aggregate
     * @secure
     * @response `200` `GetBattleLogAggregateData`
     * @response `500` `ErrorResponseDto`
     */
    getBattleLogAggregate: (
      { playerTag }: GetBattleLogAggregateParams,
      params: RequestParams = {}
    ) =>
      this.http.request<GetBattleLogAggregateData, GetBattleLogAggregateError>({
        path: `/players/${playerTag}/battle-log/aggregate`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name GetBattleLogLeaderboard
     * @request QUERY:/players/battle-log/leaderboard
     * @secure
     * @response `200` `GetBattleLogLeaderboardData`
     * @response `500` `ErrorResponseDto`
     */
    getBattleLogLeaderboard: (data: BattleLogLeaderboardInputDto, params: RequestParams = {}) =>
      this.http.request<GetBattleLogLeaderboardData, GetBattleLogLeaderboardError>({
        path: `/players/battle-log/leaderboard`,
        method: 'QUERY',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
     *
     * @tags Players
     * @name GetBattleLogLeaderboardViaPost
     * @request POST:/players/battle-log/leaderboard
     * @deprecated
     * @secure
     * @response `201` `GetBattleLogLeaderboardViaPostData`
     * @response `500` `ErrorResponseDto`
     */
    getBattleLogLeaderboardViaPost: (
      data: BattleLogLeaderboardInputDto,
      params: RequestParams = {}
    ) =>
      this.http.request<GetBattleLogLeaderboardViaPostData, GetBattleLogLeaderboardViaPostError>({
        path: `/players/battle-log/leaderboard`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name GetClanHistory
     * @request GET:/players/{playerTag}/history
     * @secure
     * @response `200` `GetClanHistoryData`
     * @response `500` `ErrorResponseDto`
     */
    getClanHistory: ({ playerTag }: GetClanHistoryParams, params: RequestParams = {}) =>
      this.http.request<GetClanHistoryData, GetClanHistoryError>({
        path: `/players/${playerTag}/history`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name GetAttackHistory
     * @request GET:/players/{playerTag}/wars
     * @secure
     * @response `200` `GetAttackHistoryData`
     * @response `500` `ErrorResponseDto`
     */
    getAttackHistory: (
      { playerTag, ...query }: GetAttackHistoryParams,
      params: RequestParams = {}
    ) =>
      this.http.request<GetAttackHistoryData, GetAttackHistoryError>({
        path: `/players/${playerTag}/wars`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name AggregateAttackHistory
     * @request GET:/players/{playerTag}/wars/aggregate
     * @secure
     * @response `200` `AggregateAttackHistoryData`
     * @response `500` `ErrorResponseDto`
     */
    aggregateAttackHistory: (
      { playerTag, ...query }: AggregateAttackHistoryParams,
      params: RequestParams = {}
    ) =>
      this.http.request<AggregateAttackHistoryData, AggregateAttackHistoryError>({
        path: `/players/${playerTag}/wars/aggregate`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Players
     * @name AggregateClanWarLeagueHistory
     * @request GET:/players/{playerTag}/clan-war-leagues/aggregate
     * @secure
     * @response `200` `AggregateClanWarLeagueHistoryData`
     * @response `500` `ErrorResponseDto`
     */
    aggregateClanWarLeagueHistory: (
      { playerTag, ...query }: AggregateClanWarLeagueHistoryParams,
      params: RequestParams = {}
    ) =>
      this.http.request<AggregateClanWarLeagueHistoryData, AggregateClanWarLeagueHistoryError>({
        path: `/players/${playerTag}/clan-war-leagues/aggregate`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      })
  };
  legends = {
    /**
     * No description
     *
     * @tags Legends
     * @name GetLegendRankingThresholds
     * @request GET:/legends/ranking-thresholds
     * @secure
     * @response `200` `GetLegendRankingThresholdsData`
     * @response `500` `ErrorResponseDto`
     */
    getLegendRankingThresholds: (params: RequestParams = {}) =>
      this.http.request<GetLegendRankingThresholdsData, GetLegendRankingThresholdsError>({
        path: `/legends/ranking-thresholds`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Legends
     * @name GetLegendAttacks
     * @request QUERY:/legends/attacks/query
     * @secure
     * @response `200` `GetLegendAttacksData`
     * @response `500` `ErrorResponseDto`
     */
    getLegendAttacks: (data: GetLegendAttacksInputDto, params: RequestParams = {}) =>
      this.http.request<GetLegendAttacksData, GetLegendAttacksError>({
        path: `/legends/attacks/query`,
        method: 'QUERY',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
     *
     * @tags Legends
     * @name GetLegendAttacksViaPost
     * @request POST:/legends/attacks/query
     * @deprecated
     * @secure
     * @response `200` `GetLegendAttacksViaPostData`
     * @response `500` `ErrorResponseDto`
     */
    getLegendAttacksViaPost: (data: GetLegendAttacksInputDto, params: RequestParams = {}) =>
      this.http.request<GetLegendAttacksViaPostData, GetLegendAttacksViaPostError>({
        path: `/legends/attacks/query`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Legends
     * @name GetLegendAttacksByPlayerTag
     * @request GET:/legends/{playerTag}/attacks
     * @secure
     * @response `200` `GetLegendAttacksByPlayerTagData`
     * @response `500` `ErrorResponseDto`
     */
    getLegendAttacksByPlayerTag: (
      { playerTag, ...query }: GetLegendAttacksByPlayerTagParams,
      params: RequestParams = {}
    ) =>
      this.http.request<GetLegendAttacksByPlayerTagData, GetLegendAttacksByPlayerTagError>({
        path: `/legends/${playerTag}/attacks`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Legends
     * @name GetLegendSeasons
     * @request GET:/legends/{playerTag}/seasons
     * @secure
     * @response `200` `GetLegendSeasonsData`
     * @response `500` `ErrorResponseDto`
     */
    getLegendSeasons: ({ playerTag }: GetLegendSeasonsParams, params: RequestParams = {}) =>
      this.http.request<GetLegendSeasonsData, GetLegendSeasonsError>({
        path: `/legends/${playerTag}/seasons`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Legends
     * @name EstimateRank
     * @request GET:/legends/{playerTag}/estimate-rank
     * @secure
     * @response `200` `EstimateRankData`
     * @response `500` `ErrorResponseDto`
     */
    estimateRank: ({ playerTag }: EstimateRankParams, params: RequestParams = {}) =>
      this.http.request<EstimateRankData, EstimateRankError>({
        path: `/legends/${playerTag}/estimate-rank`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      })
  };
  wars = {
    /**
     * No description
     *
     * @tags Wars
     * @name GetClanWarLeagueGroups
     * @request GET:/wars/{clanTag}/clan-war-leagues/groups
     * @secure
     * @response `200` `GetClanWarLeagueGroupsData`
     * @response `500` `ErrorResponseDto`
     */
    getClanWarLeagueGroups: (
      { clanTag }: GetClanWarLeagueGroupsParams,
      params: RequestParams = {}
    ) =>
      this.http.request<GetClanWarLeagueGroupsData, GetClanWarLeagueGroupsError>({
        path: `/wars/${clanTag}/clan-war-leagues/groups`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Wars
     * @name GetClanWarLeagueForClan
     * @request GET:/wars/{clanTag}/clan-war-leagues/clan
     * @secure
     * @response `200` `GetClanWarLeagueForClanData`
     * @response `500` `ErrorResponseDto`
     */
    getClanWarLeagueForClan: (
      { clanTag }: GetClanWarLeagueForClanParams,
      params: RequestParams = {}
    ) =>
      this.http.request<GetClanWarLeagueForClanData, GetClanWarLeagueForClanError>({
        path: `/wars/${clanTag}/clan-war-leagues/clan`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Wars
     * @name GetClanWarLeagueSeasons
     * @request GET:/wars/{clanTag}/clan-war-leagues/seasons
     * @secure
     * @response `200` `GetClanWarLeagueSeasonsData`
     * @response `500` `ErrorResponseDto`
     */
    getClanWarLeagueSeasons: (
      { clanTag, ...query }: GetClanWarLeagueSeasonsParams,
      params: RequestParams = {}
    ) =>
      this.http.request<GetClanWarLeagueSeasonsData, GetClanWarLeagueSeasonsError>({
        path: `/wars/${clanTag}/clan-war-leagues/seasons`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Wars
     * @name GetClanWarStats
     * @request GET:/wars/{clanTag}/members/stats
     * @secure
     * @response `200` `GetClanWarStatsData`
     * @response `500` `ErrorResponseDto`
     */
    getClanWarStats: ({ clanTag, ...query }: GetClanWarStatsParams, params: RequestParams = {}) =>
      this.http.request<GetClanWarStatsData, GetClanWarStatsError>({
        path: `/wars/${clanTag}/members/stats`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Wars
     * @name GetClanWarLeagueStandings
     * @request GET:/wars/{clanTag}/clan-war-leagues/groups/{groupId}/standings
     * @secure
     * @response `200` `GetClanWarLeagueStandingsData`
     * @response `500` `ErrorResponseDto`
     */
    getClanWarLeagueStandings: (
      { clanTag, groupId }: GetClanWarLeagueStandingsParams,
      params: RequestParams = {}
    ) =>
      this.http.request<GetClanWarLeagueStandingsData, GetClanWarLeagueStandingsError>({
        path: `/wars/${clanTag}/clan-war-leagues/groups/${groupId}/standings`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Wars
     * @name GetClanWars
     * @request GET:/wars/{clanTag}
     * @secure
     * @response `200` `GetClanWarsData`
     * @response `500` `ErrorResponseDto`
     */
    getClanWars: ({ clanTag, ...query }: GetClanWarsParams, params: RequestParams = {}) =>
      this.http.request<GetClanWarsData, GetClanWarsError>({
        path: `/wars/${clanTag}`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Wars
     * @name GetCurrentWar
     * @request GET:/wars/{clanTag}/current
     * @secure
     * @response `200` `GetCurrentWarData`
     * @response `500` `ErrorResponseDto`
     */
    getCurrentWar: ({ clanTag }: GetCurrentWarParams, params: RequestParams = {}) =>
      this.http.request<GetCurrentWarData, GetCurrentWarError>({
        path: `/wars/${clanTag}/current`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Wars
     * @name GetClanWar
     * @request GET:/wars/{clanTag}/{warId}
     * @secure
     * @response `200` `GetClanWarData`
     * @response `500` `ErrorResponseDto`
     */
    getClanWar: ({ clanTag, warId }: GetClanWarParams, params: RequestParams = {}) =>
      this.http.request<GetClanWarData, GetClanWarError>({
        path: `/wars/${clanTag}/${warId}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      })
  };
  events = {
    /**
     * No description
     *
     * @tags Events
     * @name GetEvents
     * @request GET:/events
     * @secure
     * @response `200` `GetEventsData`
     * @response `500` `ErrorResponseDto`
     */
    getEvents: (query: GetEventsParams, params: RequestParams = {}) =>
      this.http.request<GetEventsData, GetEventsError>({
        path: `/events`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Events
     * @name GetUpcomingEvents
     * @request GET:/events/upcoming
     * @secure
     * @response `200` `GetUpcomingEventsData`
     * @response `500` `ErrorResponseDto`
     */
    getUpcomingEvents: (params: RequestParams = {}) =>
      this.http.request<GetUpcomingEventsData, GetUpcomingEventsError>({
        path: `/events/upcoming`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      })
  };
  rosters = {
    /**
     * No description
     *
     * @tags Rosters
     * @name GetRosters
     * @request GET:/rosters/{guildId}/list
     * @secure
     * @response `200` `GetRostersData`
     * @response `500` `ErrorResponseDto`
     */
    getRosters: ({ guildId }: GetRostersParams, params: RequestParams = {}) =>
      this.http.request<GetRostersData, GetRostersError>({
        path: `/rosters/${guildId}/list`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name CreateRoster
     * @request POST:/rosters/{guildId}/create
     * @secure
     * @response `201` `CreateRosterData`
     * @response `500` `ErrorResponseDto`
     */
    createRoster: (
      { guildId }: CreateRosterParams,
      data: RosterInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CreateRosterData, CreateRosterError>({
        path: `/rosters/${guildId}/create`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name CreateRosterGroup
     * @request POST:/rosters/{guildId}/groups
     * @secure
     * @response `201` `CreateRosterGroupData`
     * @response `500` `ErrorResponseDto`
     */
    createRosterGroup: (
      { guildId }: CreateRosterGroupParams,
      data: RosterGroupInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CreateRosterGroupData, CreateRosterGroupError>({
        path: `/rosters/${guildId}/groups`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name UpdateRosterGroup
     * @request PATCH:/rosters/{guildId}/groups/{groupId}
     * @secure
     * @response `200` `UpdateRosterGroupData`
     * @response `500` `ErrorResponseDto`
     */
    updateRosterGroup: (
      { guildId, groupId }: UpdateRosterGroupParams,
      data: RosterGroupUpdateInput,
      params: RequestParams = {}
    ) =>
      this.http.request<UpdateRosterGroupData, UpdateRosterGroupError>({
        path: `/rosters/${guildId}/groups/${groupId}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name DeleteRosterGroup
     * @request DELETE:/rosters/{guildId}/groups/{groupId}
     * @secure
     * @response `200` `DeleteRosterGroupData`
     * @response `500` `ErrorResponseDto`
     */
    deleteRosterGroup: (
      { guildId, groupId }: DeleteRosterGroupParams,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteRosterGroupData, DeleteRosterGroupError>({
        path: `/rosters/${guildId}/groups/${groupId}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name GetRoster
     * @request GET:/rosters/{guildId}/{rosterId}
     * @secure
     * @response `200` `GetRosterData`
     * @response `500` `ErrorResponseDto`
     */
    getRoster: ({ rosterId, guildId }: GetRosterParams, params: RequestParams = {}) =>
      this.http.request<GetRosterData, GetRosterError>({
        path: `/rosters/${guildId}/${rosterId}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name UpdateRoster
     * @request PATCH:/rosters/{guildId}/{rosterId}
     * @secure
     * @response `200` `UpdateRosterData`
     * @response `500` `ErrorResponseDto`
     */
    updateRoster: (
      { guildId, rosterId }: UpdateRosterParams,
      data: RosterUpdateInput,
      params: RequestParams = {}
    ) =>
      this.http.request<UpdateRosterData, UpdateRosterError>({
        path: `/rosters/${guildId}/${rosterId}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name DeleteRoster
     * @request DELETE:/rosters/{guildId}/{rosterId}
     * @secure
     * @response `204` `DeleteRosterData`
     * @response `500` `ErrorResponseDto`
     */
    deleteRoster: ({ guildId, rosterId }: DeleteRosterParams, params: RequestParams = {}) =>
      this.http.request<DeleteRosterData, DeleteRosterError>({
        path: `/rosters/${guildId}/${rosterId}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name CloneRoster
     * @request POST:/rosters/{guildId}/{rosterId}/clone
     * @secure
     * @response `201` `CloneRosterData`
     * @response `500` `ErrorResponseDto`
     */
    cloneRoster: (
      { guildId, rosterId }: CloneRosterParams,
      data: CloneRosterInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CloneRosterData, CloneRosterError>({
        path: `/rosters/${guildId}/${rosterId}/clone`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name CheckRosterMembers
     * @request QUERY:/rosters/{guildId}/{rosterId}/members/check
     * @secure
     * @response `200` `CheckRosterMembersData`
     * @response `500` `ErrorResponseDto`
     */
    checkRosterMembers: (
      { guildId, rosterId }: CheckRosterMembersParams,
      data: RosterTagsInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CheckRosterMembersData, CheckRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members/check`,
        method: 'QUERY',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Deprecated: send the same request with the `QUERY` method. This POST is removed on 2026-11-25.
     *
     * @tags Rosters
     * @name CheckRosterMembersViaPost
     * @request POST:/rosters/{guildId}/{rosterId}/members/check
     * @deprecated
     * @secure
     * @response `200` `CheckRosterMembersViaPostData`
     * @response `500` `ErrorResponseDto`
     */
    checkRosterMembersViaPost: (
      { guildId, rosterId }: CheckRosterMembersViaPostParams,
      data: RosterTagsInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CheckRosterMembersViaPostData, CheckRosterMembersViaPostError>({
        path: `/rosters/${guildId}/${rosterId}/members/check`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name AddRosterMembers
     * @request PUT:/rosters/{guildId}/{rosterId}/members
     * @secure
     * @response `200` `AddRosterMembersData`
     * @response `500` `ErrorResponseDto`
     */
    addRosterMembers: (
      { guildId, rosterId }: AddRosterMembersParams,
      data: AddRosterMembersInput,
      params: RequestParams = {}
    ) =>
      this.http.request<AddRosterMembersData, AddRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name DeleteRosterMembers
     * @request DELETE:/rosters/{guildId}/{rosterId}/members
     * @secure
     * @response `200` `DeleteRosterMembersData`
     * @response `500` `ErrorResponseDto`
     */
    deleteRosterMembers: (
      { rosterId, guildId }: DeleteRosterMembersParams,
      data: RemoveMembersBulkInput,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteRosterMembersData, DeleteRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members`,
        method: 'DELETE',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name RefreshRosterMembers
     * @request POST:/rosters/{guildId}/{rosterId}/members/refresh
     * @secure
     * @response `201` `RefreshRosterMembersData`
     * @response `500` `ErrorResponseDto`
     */
    refreshRosterMembers: (
      { guildId, rosterId }: RefreshRosterMembersParams,
      params: RequestParams = {}
    ) =>
      this.http.request<RefreshRosterMembersData, RefreshRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members/refresh`,
        method: 'POST',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name TransferRosterMembers
     * @request PUT:/rosters/{guildId}/{rosterId}/members/transfer
     * @secure
     * @response `200` `TransferRosterMembersData`
     * @response `500` `ErrorResponseDto`
     */
    transferRosterMembers: (
      { rosterId, guildId }: TransferRosterMembersParams,
      data: TransferRosterMembersInput,
      params: RequestParams = {}
    ) =>
      this.http.request<TransferRosterMembersData, TransferRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members/transfer`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      })
  };
  users = {
    /**
     * No description
     *
     * @tags Users
     * @name GetUserSettings
     * @request GET:/users/me
     * @secure
     * @response `200` `GetUserSettingsData`
     * @response `500` `ErrorResponseDto`
     */
    getUserSettings: (params: RequestParams = {}) =>
      this.http.request<GetUserSettingsData, GetUserSettingsError>({
        path: `/users/me`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name SetDefaultClan
     * @request PUT:/users/me/clan
     * @secure
     * @response `200` `SetDefaultClanData`
     * @response `500` `ErrorResponseDto`
     */
    setDefaultClan: (data: ClanTagInput, params: RequestParams = {}) =>
      this.http.request<SetDefaultClanData, SetDefaultClanError>({
        path: `/users/me/clan`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name ClearDefaultClan
     * @request DELETE:/users/me/clan
     * @secure
     * @response `200` `ClearDefaultClanData`
     * @response `500` `ErrorResponseDto`
     */
    clearDefaultClan: (params: RequestParams = {}) =>
      this.http.request<ClearDefaultClanData, ClearDefaultClanError>({
        path: `/users/me/clan`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name AddBookmark
     * @request POST:/users/me/bookmarks
     * @secure
     * @response `201` `AddBookmarkData`
     * @response `500` `ErrorResponseDto`
     */
    addBookmark: (data: ClanTagInput, params: RequestParams = {}) =>
      this.http.request<AddBookmarkData, AddBookmarkError>({
        path: `/users/me/bookmarks`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name RemoveBookmark
     * @request DELETE:/users/me/bookmarks/{clanTag}
     * @secure
     * @response `200` `RemoveBookmarkData`
     * @response `500` `ErrorResponseDto`
     */
    removeBookmark: ({ clanTag }: RemoveBookmarkParams, params: RequestParams = {}) =>
      this.http.request<RemoveBookmarkData, RemoveBookmarkError>({
        path: `/users/me/bookmarks/${clanTag}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name SetTimezone
     * @request PUT:/users/me/timezone
     * @secure
     * @response `200` `SetTimezoneData`
     * @response `500` `ErrorResponseDto`
     */
    setTimezone: (data: TimezoneInput, params: RequestParams = {}) =>
      this.http.request<SetTimezoneData, SetTimezoneError>({
        path: `/users/me/timezone`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name ClearTimezone
     * @request DELETE:/users/me/timezone
     * @secure
     * @response `200` `ClearTimezoneData`
     * @response `500` `ErrorResponseDto`
     */
    clearTimezone: (params: RequestParams = {}) =>
      this.http.request<ClearTimezoneData, ClearTimezoneError>({
        path: `/users/me/timezone`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      })
  };
  guilds = {
    /**
     * No description
     *
     * @tags Guilds
     * @name GetGuildClans
     * @request GET:/guilds/{guildId}/clans
     * @secure
     * @response `200` `GetGuildClansData`
     * @response `500` `ErrorResponseDto`
     */
    getGuildClans: ({ guildId }: GetGuildClansParams, params: RequestParams = {}) =>
      this.http.request<GetGuildClansData, GetGuildClansError>({
        path: `/guilds/${guildId}/clans`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name AddGuildClan
     * @request POST:/guilds/{guildId}/clans
     * @secure
     * @response `201` `AddGuildClanData`
     * @response `500` `ErrorResponseDto`
     */
    addGuildClan: (
      { guildId }: AddGuildClanParams,
      data: AddGuildClanInput,
      params: RequestParams = {}
    ) =>
      this.http.request<AddGuildClanData, AddGuildClanError>({
        path: `/guilds/${guildId}/clans`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ReorderGuildClans
     * @request PATCH:/guilds/{guildId}/clans/reorder
     * @secure
     * @response `200` `ReorderGuildClansData`
     * @response `500` `ErrorResponseDto`
     */
    reorderGuildClans: (
      { guildId }: ReorderGuildClansParams,
      data: ReorderClanCategoriesInput,
      params: RequestParams = {}
    ) =>
      this.http.request<ReorderGuildClansData, ReorderGuildClansError>({
        path: `/guilds/${guildId}/clans/reorder`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name RemoveGuildClan
     * @request DELETE:/guilds/{guildId}/clans/{clanTag}
     * @secure
     * @response `200` `RemoveGuildClanData`
     * @response `500` `ErrorResponseDto`
     */
    removeGuildClan: ({ guildId, clanTag }: RemoveGuildClanParams, params: RequestParams = {}) =>
      this.http.request<RemoveGuildClanData, RemoveGuildClanError>({
        path: `/guilds/${guildId}/clans/${clanTag}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name UpdateGuildClan
     * @request PATCH:/guilds/{guildId}/clans/{clanTag}
     * @secure
     * @response `200` `UpdateGuildClanData`
     * @response `500` `ErrorResponseDto`
     */
    updateGuildClan: (
      { guildId, clanTag }: UpdateGuildClanParams,
      data: ClanSettingsInput,
      params: RequestParams = {}
    ) =>
      this.http.request<UpdateGuildClanData, UpdateGuildClanError>({
        path: `/guilds/${guildId}/clans/${clanTag}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name CreateClanCategory
     * @request POST:/guilds/{guildId}/categories
     * @secure
     * @response `201` `CreateClanCategoryData`
     * @response `500` `ErrorResponseDto`
     */
    createClanCategory: (
      { guildId }: CreateClanCategoryParams,
      data: ClanCategoryInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CreateClanCategoryData, CreateClanCategoryError>({
        path: `/guilds/${guildId}/categories`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name RenameClanCategory
     * @request PATCH:/guilds/{guildId}/categories/{categoryId}
     * @secure
     * @response `200` `RenameClanCategoryData`
     * @response `500` `ErrorResponseDto`
     */
    renameClanCategory: (
      { guildId, categoryId }: RenameClanCategoryParams,
      data: ClanCategoryInput,
      params: RequestParams = {}
    ) =>
      this.http.request<RenameClanCategoryData, RenameClanCategoryError>({
        path: `/guilds/${guildId}/categories/${categoryId}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteClanCategory
     * @request DELETE:/guilds/{guildId}/categories/{categoryId}
     * @secure
     * @response `200` `DeleteClanCategoryData`
     * @response `500` `ErrorResponseDto`
     */
    deleteClanCategory: (
      { guildId, categoryId }: DeleteClanCategoryParams,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteClanCategoryData, DeleteClanCategoryError>({
        path: `/guilds/${guildId}/categories/${categoryId}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetGuildReminders
     * @request GET:/guilds/{guildId}/reminders
     * @secure
     * @response `200` `GetGuildRemindersData`
     * @response `500` `ErrorResponseDto`
     */
    getGuildReminders: ({ guildId }: GetGuildRemindersParams, params: RequestParams = {}) =>
      this.http.request<GetGuildRemindersData, GetGuildRemindersError>({
        path: `/guilds/${guildId}/reminders`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ListChannels
     * @request GET:/guilds/{guildId}/channels
     * @secure
     * @response `200` `ListChannelsData`
     * @response `500` `ErrorResponseDto`
     */
    listChannels: ({ guildId }: ListChannelsParams, params: RequestParams = {}) =>
      this.http.request<ListChannelsData, ListChannelsError>({
        path: `/guilds/${guildId}/channels`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ListRoles
     * @request GET:/guilds/{guildId}/roles
     * @secure
     * @response `200` `ListRolesData`
     * @response `500` `ErrorResponseDto`
     */
    listRoles: ({ guildId }: ListRolesParams, params: RequestParams = {}) =>
      this.http.request<ListRolesData, ListRolesError>({
        path: `/guilds/${guildId}/roles`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetReminderPings
     * @request GET:/guilds/{guildId}/reminders/pings
     * @secure
     * @response `200` `GetReminderPingsData`
     * @response `500` `ErrorResponseDto`
     */
    getReminderPings: ({ guildId }: GetReminderPingsParams, params: RequestParams = {}) =>
      this.http.request<GetReminderPingsData, GetReminderPingsError>({
        path: `/guilds/${guildId}/reminders/pings`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveReminderPings
     * @request PUT:/guilds/{guildId}/reminders/pings
     * @secure
     * @response `200` `SaveReminderPingsData`
     * @response `500` `ErrorResponseDto`
     */
    saveReminderPings: (
      { guildId }: SaveReminderPingsParams,
      data: ReminderPingsInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveReminderPingsData, SaveReminderPingsError>({
        path: `/guilds/${guildId}/reminders/pings`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name CreateClanWarReminder
     * @request POST:/guilds/{guildId}/reminders/clan-wars
     * @secure
     * @response `201` `CreateClanWarReminderData`
     * @response `500` `ErrorResponseDto`
     */
    createClanWarReminder: (
      { guildId }: CreateClanWarReminderParams,
      data: ClanWarReminderInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CreateClanWarReminderData, CreateClanWarReminderError>({
        path: `/guilds/${guildId}/reminders/clan-wars`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name UpdateClanWarReminder
     * @request PUT:/guilds/{guildId}/reminders/clan-wars/{reminderId}
     * @secure
     * @response `200` `UpdateClanWarReminderData`
     * @response `500` `ErrorResponseDto`
     */
    updateClanWarReminder: (
      { guildId, reminderId }: UpdateClanWarReminderParams,
      data: ClanWarReminderInput,
      params: RequestParams = {}
    ) =>
      this.http.request<UpdateClanWarReminderData, UpdateClanWarReminderError>({
        path: `/guilds/${guildId}/reminders/clan-wars/${reminderId}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteClanWarReminder
     * @request DELETE:/guilds/{guildId}/reminders/clan-wars/{reminderId}
     * @secure
     * @response `204` `DeleteClanWarReminderData`
     * @response `500` `ErrorResponseDto`
     */
    deleteClanWarReminder: (
      { guildId, reminderId }: DeleteClanWarReminderParams,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteClanWarReminderData, DeleteClanWarReminderError>({
        path: `/guilds/${guildId}/reminders/clan-wars/${reminderId}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name CreateCapitalRaidReminder
     * @request POST:/guilds/{guildId}/reminders/capital-raids
     * @secure
     * @response `201` `CreateCapitalRaidReminderData`
     * @response `500` `ErrorResponseDto`
     */
    createCapitalRaidReminder: (
      { guildId }: CreateCapitalRaidReminderParams,
      data: CapitalRaidReminderInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CreateCapitalRaidReminderData, CreateCapitalRaidReminderError>({
        path: `/guilds/${guildId}/reminders/capital-raids`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name UpdateCapitalRaidReminder
     * @request PUT:/guilds/{guildId}/reminders/capital-raids/{reminderId}
     * @secure
     * @response `200` `UpdateCapitalRaidReminderData`
     * @response `500` `ErrorResponseDto`
     */
    updateCapitalRaidReminder: (
      { guildId, reminderId }: UpdateCapitalRaidReminderParams,
      data: CapitalRaidReminderInput,
      params: RequestParams = {}
    ) =>
      this.http.request<UpdateCapitalRaidReminderData, UpdateCapitalRaidReminderError>({
        path: `/guilds/${guildId}/reminders/capital-raids/${reminderId}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteCapitalRaidReminder
     * @request DELETE:/guilds/{guildId}/reminders/capital-raids/{reminderId}
     * @secure
     * @response `204` `DeleteCapitalRaidReminderData`
     * @response `500` `ErrorResponseDto`
     */
    deleteCapitalRaidReminder: (
      { guildId, reminderId }: DeleteCapitalRaidReminderParams,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteCapitalRaidReminderData, DeleteCapitalRaidReminderError>({
        path: `/guilds/${guildId}/reminders/capital-raids/${reminderId}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name CreateClanGamesReminder
     * @request POST:/guilds/{guildId}/reminders/clan-games
     * @secure
     * @response `201` `CreateClanGamesReminderData`
     * @response `500` `ErrorResponseDto`
     */
    createClanGamesReminder: (
      { guildId }: CreateClanGamesReminderParams,
      data: ClanGamesReminderInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CreateClanGamesReminderData, CreateClanGamesReminderError>({
        path: `/guilds/${guildId}/reminders/clan-games`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name UpdateClanGamesReminder
     * @request PUT:/guilds/{guildId}/reminders/clan-games/{reminderId}
     * @secure
     * @response `200` `UpdateClanGamesReminderData`
     * @response `500` `ErrorResponseDto`
     */
    updateClanGamesReminder: (
      { guildId, reminderId }: UpdateClanGamesReminderParams,
      data: ClanGamesReminderInput,
      params: RequestParams = {}
    ) =>
      this.http.request<UpdateClanGamesReminderData, UpdateClanGamesReminderError>({
        path: `/guilds/${guildId}/reminders/clan-games/${reminderId}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteClanGamesReminder
     * @request DELETE:/guilds/{guildId}/reminders/clan-games/{reminderId}
     * @secure
     * @response `204` `DeleteClanGamesReminderData`
     * @response `500` `ErrorResponseDto`
     */
    deleteClanGamesReminder: (
      { guildId, reminderId }: DeleteClanGamesReminderParams,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteClanGamesReminderData, DeleteClanGamesReminderError>({
        path: `/guilds/${guildId}/reminders/clan-games/${reminderId}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ListGuildClanLogs
     * @request GET:/guilds/{guildId}/clan-logs
     * @secure
     * @response `200` `ListGuildClanLogsData`
     * @response `500` `ErrorResponseDto`
     */
    listGuildClanLogs: ({ guildId }: ListGuildClanLogsParams, params: RequestParams = {}) =>
      this.http.request<ListGuildClanLogsData, ListGuildClanLogsError>({
        path: `/guilds/${guildId}/clan-logs`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetClanLogLimit
     * @request GET:/guilds/{guildId}/clan-logs/limit
     * @secure
     * @response `200` `GetClanLogLimitData`
     * @response `500` `ErrorResponseDto`
     */
    getClanLogLimit: ({ guildId }: GetClanLogLimitParams, params: RequestParams = {}) =>
      this.http.request<GetClanLogLimitData, GetClanLogLimitError>({
        path: `/guilds/${guildId}/clan-logs/limit`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetClanEmbed
     * @request GET:/guilds/{guildId}/clans/{clanTag}/embed
     * @secure
     * @response `200` `GetClanEmbedData`
     * @response `500` `ErrorResponseDto`
     */
    getClanEmbed: ({ guildId, clanTag }: GetClanEmbedParams, params: RequestParams = {}) =>
      this.http.request<GetClanEmbedData, GetClanEmbedError>({
        path: `/guilds/${guildId}/clans/${clanTag}/embed`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveClanEmbed
     * @request PUT:/guilds/{guildId}/clans/{clanTag}/embed
     * @secure
     * @response `200` `SaveClanEmbedData`
     * @response `500` `ErrorResponseDto`
     */
    saveClanEmbed: (
      { guildId, clanTag }: SaveClanEmbedParams,
      data: ClanEmbedInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveClanEmbedData, SaveClanEmbedError>({
        path: `/guilds/${guildId}/clans/${clanTag}/embed`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteClanEmbed
     * @request DELETE:/guilds/{guildId}/clans/{clanTag}/embed
     * @secure
     * @response `204` `DeleteClanEmbedData`
     * @response `500` `ErrorResponseDto`
     */
    deleteClanEmbed: ({ guildId, clanTag }: DeleteClanEmbedParams, params: RequestParams = {}) =>
      this.http.request<DeleteClanEmbedData, DeleteClanEmbedError>({
        path: `/guilds/${guildId}/clans/${clanTag}/embed`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ListClanLogs
     * @request GET:/guilds/{guildId}/clans/{clanTag}/logs
     * @secure
     * @response `200` `ListClanLogsData`
     * @response `500` `ErrorResponseDto`
     */
    listClanLogs: ({ guildId, clanTag }: ListClanLogsParams, params: RequestParams = {}) =>
      this.http.request<ListClanLogsData, ListClanLogsError>({
        path: `/guilds/${guildId}/clans/${clanTag}/logs`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveClanLog
     * @request PUT:/guilds/{guildId}/clans/{clanTag}/logs/{logType}
     * @secure
     * @response `200` `SaveClanLogData`
     * @response `500` `ErrorResponseDto`
     */
    saveClanLog: (
      { guildId, clanTag, logType }: SaveClanLogParams,
      data: ClanLogInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveClanLogData, SaveClanLogError>({
        path: `/guilds/${guildId}/clans/${clanTag}/logs/${logType}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteClanLog
     * @request DELETE:/guilds/{guildId}/clans/{clanTag}/logs/{logType}
     * @secure
     * @response `204` `DeleteClanLogData`
     * @response `500` `ErrorResponseDto`
     */
    deleteClanLog: (
      { guildId, clanTag, logType }: DeleteClanLogParams,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteClanLogData, DeleteClanLogError>({
        path: `/guilds/${guildId}/clans/${clanTag}/logs/${logType}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetAutoRoles
     * @request GET:/guilds/{guildId}/auto-roles
     * @secure
     * @response `200` `GetAutoRolesData`
     * @response `500` `ErrorResponseDto`
     */
    getAutoRoles: ({ guildId }: GetAutoRolesParams, params: RequestParams = {}) =>
      this.http.request<GetAutoRolesData, GetAutoRolesError>({
        path: `/guilds/${guildId}/auto-roles`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveAutoRoles
     * @request PATCH:/guilds/{guildId}/auto-roles
     * @secure
     * @response `200` `SaveAutoRolesData`
     * @response `500` `ErrorResponseDto`
     */
    saveAutoRoles: (
      { guildId }: SaveAutoRolesParams,
      data: AutoRolesInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveAutoRolesData, SaveAutoRolesError>({
        path: `/guilds/${guildId}/auto-roles`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveClanAutoRoles
     * @request PUT:/guilds/{guildId}/auto-roles/clans/{clanTag}
     * @secure
     * @response `200` `SaveClanAutoRolesData`
     * @response `500` `ErrorResponseDto`
     */
    saveClanAutoRoles: (
      { guildId, clanTag }: SaveClanAutoRolesParams,
      data: AutoRoleClanInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveClanAutoRolesData, SaveClanAutoRolesError>({
        path: `/guilds/${guildId}/auto-roles/clans/${clanTag}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ListFlags
     * @request GET:/guilds/{guildId}/flags
     * @secure
     * @response `200` `ListFlagsData`
     * @response `500` `ErrorResponseDto`
     */
    listFlags: ({ guildId, ...query }: ListFlagsParams, params: RequestParams = {}) =>
      this.http.request<ListFlagsData, ListFlagsError>({
        path: `/guilds/${guildId}/flags`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name CreateFlags
     * @request POST:/guilds/{guildId}/flags
     * @secure
     * @response `201` `CreateFlagsData`
     * @response `500` `ErrorResponseDto`
     */
    createFlags: ({ guildId }: CreateFlagsParams, data: FlagInput, params: RequestParams = {}) =>
      this.http.request<CreateFlagsData, CreateFlagsError>({
        path: `/guilds/${guildId}/flags`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteFlag
     * @request DELETE:/guilds/{guildId}/flags/{flagId}
     * @secure
     * @response `204` `DeleteFlagData`
     * @response `500` `ErrorResponseDto`
     */
    deleteFlag: ({ guildId, flagId }: DeleteFlagParams, params: RequestParams = {}) =>
      this.http.request<DeleteFlagData, DeleteFlagError>({
        path: `/guilds/${guildId}/flags/${flagId}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ListMembers
     * @request GET:/guilds/{guildId}/members/list
     * @secure
     * @response `200` `ListMembersData`
     * @response `500` `ErrorResponseDto`
     */
    listMembers: ({ guildId, ...query }: ListMembersParams, params: RequestParams = {}) =>
      this.http.request<ListMembersData, ListMembersError>({
        path: `/guilds/${guildId}/members/list`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetServerLogs
     * @request GET:/guilds/{guildId}/server-logs
     * @secure
     * @response `200` `GetServerLogsData`
     * @response `500` `ErrorResponseDto`
     */
    getServerLogs: ({ guildId }: GetServerLogsParams, params: RequestParams = {}) =>
      this.http.request<GetServerLogsData, GetServerLogsError>({
        path: `/guilds/${guildId}/server-logs`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveFlagAlertLog
     * @request PUT:/guilds/{guildId}/server-logs/flag-alert
     * @secure
     * @response `200` `SaveFlagAlertLogData`
     * @response `500` `ErrorResponseDto`
     */
    saveFlagAlertLog: (
      { guildId }: SaveFlagAlertLogParams,
      data: FlagAlertLogInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveFlagAlertLogData, SaveFlagAlertLogError>({
        path: `/guilds/${guildId}/server-logs/flag-alert`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteFlagAlertLog
     * @request DELETE:/guilds/{guildId}/server-logs/flag-alert
     * @secure
     * @response `200` `DeleteFlagAlertLogData`
     * @response `500` `ErrorResponseDto`
     */
    deleteFlagAlertLog: ({ guildId }: DeleteFlagAlertLogParams, params: RequestParams = {}) =>
      this.http.request<DeleteFlagAlertLogData, DeleteFlagAlertLogError>({
        path: `/guilds/${guildId}/server-logs/flag-alert`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveRosterChangelog
     * @request PUT:/guilds/{guildId}/server-logs/roster-changelog
     * @secure
     * @response `200` `SaveRosterChangelogData`
     * @response `500` `ErrorResponseDto`
     */
    saveRosterChangelog: (
      { guildId }: SaveRosterChangelogParams,
      data: ServerLogChannelInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveRosterChangelogData, SaveRosterChangelogError>({
        path: `/guilds/${guildId}/server-logs/roster-changelog`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteRosterChangelog
     * @request DELETE:/guilds/{guildId}/server-logs/roster-changelog
     * @secure
     * @response `200` `DeleteRosterChangelogData`
     * @response `500` `ErrorResponseDto`
     */
    deleteRosterChangelog: ({ guildId }: DeleteRosterChangelogParams, params: RequestParams = {}) =>
      this.http.request<DeleteRosterChangelogData, DeleteRosterChangelogError>({
        path: `/guilds/${guildId}/server-logs/roster-changelog`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveMaintenanceLog
     * @request PUT:/guilds/{guildId}/server-logs/maintenance
     * @secure
     * @response `200` `SaveMaintenanceLogData`
     * @response `500` `ErrorResponseDto`
     */
    saveMaintenanceLog: (
      { guildId }: SaveMaintenanceLogParams,
      data: MaintenanceLogInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveMaintenanceLogData, SaveMaintenanceLogError>({
        path: `/guilds/${guildId}/server-logs/maintenance`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteMaintenanceLog
     * @request DELETE:/guilds/{guildId}/server-logs/maintenance
     * @secure
     * @response `200` `DeleteMaintenanceLogData`
     * @response `500` `ErrorResponseDto`
     */
    deleteMaintenanceLog: ({ guildId }: DeleteMaintenanceLogParams, params: RequestParams = {}) =>
      this.http.request<DeleteMaintenanceLogData, DeleteMaintenanceLogError>({
        path: `/guilds/${guildId}/server-logs/maintenance`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveWelcomeLog
     * @request PUT:/guilds/{guildId}/server-logs/welcome
     * @secure
     * @response `200` `SaveWelcomeLogData`
     * @response `500` `ErrorResponseDto`
     */
    saveWelcomeLog: (
      { guildId }: SaveWelcomeLogParams,
      data: WelcomeLogInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveWelcomeLogData, SaveWelcomeLogError>({
        path: `/guilds/${guildId}/server-logs/welcome`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteWelcomeLog
     * @summary Turns the welcome message off but keeps it, as `/setup server-logs disable` does.
     * @request DELETE:/guilds/{guildId}/server-logs/welcome
     * @secure
     * @response `200` `DeleteWelcomeLogData`
     * @response `500` `ErrorResponseDto`
     */
    deleteWelcomeLog: ({ guildId }: DeleteWelcomeLogParams, params: RequestParams = {}) =>
      this.http.request<DeleteWelcomeLogData, DeleteWelcomeLogError>({
        path: `/guilds/${guildId}/server-logs/welcome`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetButtons
     * @request GET:/guilds/{guildId}/buttons
     * @secure
     * @response `200` `GetButtonsData`
     * @response `500` `ErrorResponseDto`
     */
    getButtons: ({ guildId }: GetButtonsParams, params: RequestParams = {}) =>
      this.http.request<GetButtonsData, GetButtonsError>({
        path: `/guilds/${guildId}/buttons`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveButton
     * @summary Saves what `/setup buttons` posts; messages already posted keep their old look.
     * @request PUT:/guilds/{guildId}/buttons/{buttonType}
     * @secure
     * @response `200` `SaveButtonData`
     * @response `500` `ErrorResponseDto`
     */
    saveButton: (
      { guildId, buttonType }: SaveButtonParams,
      data: ButtonMessageInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveButtonData, SaveButtonError>({
        path: `/guilds/${guildId}/buttons/${buttonType}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetManagerRoles
     * @request GET:/guilds/{guildId}/managers
     * @secure
     * @response `200` `GetManagerRolesData`
     * @response `500` `ErrorResponseDto`
     */
    getManagerRoles: ({ guildId }: GetManagerRolesParams, params: RequestParams = {}) =>
      this.http.request<GetManagerRolesData, GetManagerRolesError>({
        path: `/guilds/${guildId}/managers`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveManagerRoles
     * @request PATCH:/guilds/{guildId}/managers
     * @secure
     * @response `200` `SaveManagerRolesData`
     * @response `500` `ErrorResponseDto`
     */
    saveManagerRoles: (
      { guildId }: SaveManagerRolesParams,
      data: ManagerRolesInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveManagerRolesData, SaveManagerRolesError>({
        path: `/guilds/${guildId}/managers`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetConfig
     * @request GET:/guilds/{guildId}/config
     * @secure
     * @response `200` `GetConfigData`
     * @response `500` `ErrorResponseDto`
     */
    getConfig: ({ guildId }: GetConfigParams, params: RequestParams = {}) =>
      this.http.request<GetConfigData, GetConfigError>({
        path: `/guilds/${guildId}/config`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveConfig
     * @request PATCH:/guilds/{guildId}/config
     * @secure
     * @response `200` `SaveConfigData`
     * @response `500` `ErrorResponseDto`
     */
    saveConfig: (
      { guildId }: SaveConfigParams,
      data: ServerConfigInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveConfigData, SaveConfigError>({
        path: `/guilds/${guildId}/config`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetGuildBeta
     * @request GET:/guilds/{guildId}/beta
     * @secure
     * @response `200` `GetGuildBetaData`
     * @response `500` `ErrorResponseDto`
     */
    getGuildBeta: ({ guildId }: GetGuildBetaParams, params: RequestParams = {}) =>
      this.http.request<GetGuildBetaData, GetGuildBetaError>({
        path: `/guilds/${guildId}/beta`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ListCategories
     * @request GET:/guilds/{guildId}/channel-categories
     * @secure
     * @response `200` `ListCategoriesData`
     * @response `500` `ErrorResponseDto`
     */
    listCategories: ({ guildId }: ListCategoriesParams, params: RequestParams = {}) =>
      this.http.request<ListCategoriesData, ListCategoriesError>({
        path: `/guilds/${guildId}/channel-categories`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name GetTickets
     * @request GET:/guilds/{guildId}/tickets
     * @secure
     * @response `200` `GetTicketsData`
     * @response `500` `ErrorResponseDto`
     */
    getTickets: ({ guildId }: GetTicketsParams, params: RequestParams = {}) =>
      this.http.request<GetTicketsData, GetTicketsError>({
        path: `/guilds/${guildId}/tickets`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name CreateTicketPanel
     * @request POST:/guilds/{guildId}/tickets/panels
     * @secure
     * @response `201` `CreateTicketPanelData`
     * @response `500` `ErrorResponseDto`
     */
    createTicketPanel: (
      { guildId }: CreateTicketPanelParams,
      data: CreateTicketPanelInput,
      params: RequestParams = {}
    ) =>
      this.http.request<CreateTicketPanelData, CreateTicketPanelError>({
        path: `/guilds/${guildId}/tickets/panels`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name UpdateTicketPanel
     * @request PATCH:/guilds/{guildId}/tickets/panels/{panelId}
     * @secure
     * @response `200` `UpdateTicketPanelData`
     * @response `500` `ErrorResponseDto`
     */
    updateTicketPanel: (
      { guildId, panelId }: UpdateTicketPanelParams,
      data: TicketPanelInput,
      params: RequestParams = {}
    ) =>
      this.http.request<UpdateTicketPanelData, UpdateTicketPanelError>({
        path: `/guilds/${guildId}/tickets/panels/${panelId}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteTicketPanel
     * @request DELETE:/guilds/{guildId}/tickets/panels/{panelId}
     * @secure
     * @response `200` `DeleteTicketPanelData`
     * @response `500` `ErrorResponseDto`
     */
    deleteTicketPanel: (
      { guildId, panelId }: DeleteTicketPanelParams,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteTicketPanelData, DeleteTicketPanelError>({
        path: `/guilds/${guildId}/tickets/panels/${panelId}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name AddTicketType
     * @request POST:/guilds/{guildId}/tickets/panels/{panelId}/types
     * @secure
     * @response `201` `AddTicketTypeData`
     * @response `500` `ErrorResponseDto`
     */
    addTicketType: (
      { guildId, panelId }: AddTicketTypeParams,
      data: CreateTicketTypeInput,
      params: RequestParams = {}
    ) =>
      this.http.request<AddTicketTypeData, AddTicketTypeError>({
        path: `/guilds/${guildId}/tickets/panels/${panelId}/types`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name ReorderTicketTypes
     * @request PUT:/guilds/{guildId}/tickets/panels/{panelId}/types/order
     * @secure
     * @response `200` `ReorderTicketTypesData`
     * @response `500` `ErrorResponseDto`
     */
    reorderTicketTypes: (
      { guildId, panelId }: ReorderTicketTypesParams,
      data: ReorderTicketTypesInput,
      params: RequestParams = {}
    ) =>
      this.http.request<ReorderTicketTypesData, ReorderTicketTypesError>({
        path: `/guilds/${guildId}/tickets/panels/${panelId}/types/order`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name UpdateTicketType
     * @request PATCH:/guilds/{guildId}/tickets/panels/{panelId}/types/{typeId}
     * @secure
     * @response `200` `UpdateTicketTypeData`
     * @response `500` `ErrorResponseDto`
     */
    updateTicketType: (
      { guildId, panelId, typeId }: UpdateTicketTypeParams,
      data: TicketTypeInput,
      params: RequestParams = {}
    ) =>
      this.http.request<UpdateTicketTypeData, UpdateTicketTypeError>({
        path: `/guilds/${guildId}/tickets/panels/${panelId}/types/${typeId}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name DeleteTicketType
     * @request DELETE:/guilds/{guildId}/tickets/panels/{panelId}/types/{typeId}
     * @secure
     * @response `200` `DeleteTicketTypeData`
     * @response `500` `ErrorResponseDto`
     */
    deleteTicketType: (
      { guildId, panelId, typeId }: DeleteTicketTypeParams,
      params: RequestParams = {}
    ) =>
      this.http.request<DeleteTicketTypeData, DeleteTicketTypeError>({
        path: `/guilds/${guildId}/tickets/panels/${panelId}/types/${typeId}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Guilds
     * @name SaveTicketReplies
     * @request PUT:/guilds/{guildId}/tickets/saved-replies
     * @secure
     * @response `200` `SaveTicketRepliesData`
     * @response `500` `ErrorResponseDto`
     */
    saveTicketReplies: (
      { guildId }: SaveTicketRepliesParams,
      data: TicketSavedRepliesInput,
      params: RequestParams = {}
    ) =>
      this.http.request<SaveTicketRepliesData, SaveTicketRepliesError>({
        path: `/guilds/${guildId}/tickets/saved-replies`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      })
  };
  exports = {
    /**
     * No description
     *
     * @tags Internal
     * @name ExportClanMembers
     * @request POST:/exports/members
     * @response `201` `ExportClanMembersData`
     * @response `500` `ErrorResponseDto`
     */
    exportClanMembers: (data: ExportMembersInput, params: RequestParams = {}) =>
      this.http.request<ExportClanMembersData, ExportClanMembersError>({
        path: `/exports/members`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params
      })
  };
  admin = {
    /**
     * No description
     *
     * @tags Admin
     * @name ListBetaGuilds
     * @request GET:/admin/beta-guilds
     * @secure
     * @response `200` `ListBetaGuildsData`
     * @response `500` `ErrorResponseDto`
     */
    listBetaGuilds: (params: RequestParams = {}) =>
      this.http.request<ListBetaGuildsData, ListBetaGuildsError>({
        path: `/admin/beta-guilds`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AddBetaGuilds
     * @request POST:/admin/beta-guilds
     * @secure
     * @response `201` `AddBetaGuildsData`
     * @response `500` `ErrorResponseDto`
     */
    addBetaGuilds: (data: AddBetaGuildsInput, params: RequestParams = {}) =>
      this.http.request<AddBetaGuildsData, AddBetaGuildsError>({
        path: `/admin/beta-guilds`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name RemoveBetaGuild
     * @request DELETE:/admin/beta-guilds/{guildId}
     * @secure
     * @response `200` `RemoveBetaGuildData`
     * @response `500` `ErrorResponseDto`
     */
    removeBetaGuild: ({ guildId }: RemoveBetaGuildParams, params: RequestParams = {}) =>
      this.http.request<RemoveBetaGuildData, RemoveBetaGuildError>({
        path: `/admin/beta-guilds/${guildId}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name ListSubscribers
     * @request GET:/admin/subscribers
     * @secure
     * @response `200` `ListSubscribersData`
     * @response `500` `ErrorResponseDto`
     */
    listSubscribers: (params: RequestParams = {}) =>
      this.http.request<ListSubscribersData, ListSubscribersError>({
        path: `/admin/subscribers`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name ListDevelopers
     * @request GET:/admin/developers
     * @secure
     * @response `200` `ListDevelopersData`
     * @response `500` `ErrorResponseDto`
     */
    listDevelopers: (params: RequestParams = {}) =>
      this.http.request<ListDevelopersData, ListDevelopersError>({
        path: `/admin/developers`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AddDeveloper
     * @request POST:/admin/developers
     * @secure
     * @response `201` `AddDeveloperData`
     * @response `500` `ErrorResponseDto`
     */
    addDeveloper: (data: AddDeveloperInput, params: RequestParams = {}) =>
      this.http.request<AddDeveloperData, AddDeveloperError>({
        path: `/admin/developers`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name EditDeveloper
     * @request PATCH:/admin/developers/{userId}
     * @secure
     * @response `200` `EditDeveloperData`
     * @response `500` `ErrorResponseDto`
     */
    editDeveloper: (
      { userId }: EditDeveloperParams,
      data: EditDeveloperInput,
      params: RequestParams = {}
    ) =>
      this.http.request<EditDeveloperData, EditDeveloperError>({
        path: `/admin/developers/${userId}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name RevokeDeveloper
     * @request DELETE:/admin/developers/{userId}
     * @secure
     * @response `200` `RevokeDeveloperData`
     * @response `500` `ErrorResponseDto`
     */
    revokeDeveloper: ({ userId }: RevokeDeveloperParams, params: RequestParams = {}) =>
      this.http.request<RevokeDeveloperData, RevokeDeveloperError>({
        path: `/admin/developers/${userId}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params
      })
  };
  betaGuilds = {
    /**
     * No description
     *
     * @tags Internal
     * @name ListBetaGuildIds
     * @request GET:/beta-guilds/ids
     * @secure
     * @response `200` `ListBetaGuildIdsData`
     * @response `500` `ErrorResponseDto`
     */
    listBetaGuildIds: (params: RequestParams = {}) =>
      this.http.request<ListBetaGuildIdsData, ListBetaGuildIdsError>({
        path: `/beta-guilds/ids`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      })
  };
}
