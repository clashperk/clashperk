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

export enum WarTypes {
  REGULAR = 1,
  FRIENDLY = 2,
  CWL = 3,
}

export enum UserRoles {
  USER = "user",
  ADMIN = "admin",
  VIEWER = "viewer",
  FETCH_WARS = "fetch:wars",
  FETCH_CLANS = "fetch:clans",
  FETCH_PLAYERS = "fetch:players",
  FETCH_LEGENDS = "fetch:legends",
  FETCH_LINKS = "fetch:links",
  MANAGE_LINKS = "manage:links",
  MANAGE_ROSTERS = "manage:rosters",
  MANAGE_REMINDERS = "manage:reminders",
}

export enum ErrorCodes {
  FORBIDDEN = "FORBIDDEN",
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
  BAD_REQUEST = "BAD_REQUEST",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  HANDOFF_TOKEN_EXPIRED = "HANDOFF_TOKEN_EXPIRED",
  USER_BLOCKED = "USER_BLOCKED",
  INVALID_PASSKEY = "INVALID_PASSKEY",
  GUILD_ACCESS_FORBIDDEN = "GUILD_ACCESS_FORBIDDEN",
}

export interface ErrorResponseDto {
  /** @example "string" */
  code: ErrorCodes;
  message: string;
  statusCode: number;
  method: string;
  path: string;
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
  /** @default ["user","admin","viewer","fetch:wars","fetch:clans","fetch:players","fetch:legends","fetch:links","manage:links","manage:rosters","manage:reminders"] */
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

export interface HandoffUserDto {
  roles: UserRoles[];
  userId: string;
  displayName: string;
  username: string;
  isBot: boolean;
  guildId: string;
  avatarUrl: string | null;
}

export interface HandoffTokenInputDto {
  userId: string;
  guildId: string;
}

export interface HandoffTokenDto {
  token: string;
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
  season: string;
  totalAttacks: number;
  totalMissed: number;
  totalDestruction: number;
  totalStars: number;
  totalWars: number;
  rounds: number;
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

export interface LeaderboardByTagsInputDto {
  /**
   * @maxItems 100
   * @minItems 0
   * @example ["#2PP"]
   */
  playerTags: string[];
  /** @example 1 */
  minRank: number;
  /** @example 100 */
  maxRank: number;
}

export interface LeaderboardByTagsDto {
  tag: string;
  name: string;
  rank: number;
  trophies: number;
}

export interface LeaderboardByTagsItemsDto {
  items: LeaderboardByTagsDto[];
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

export interface ClanWarLeagueRound {
  warTags: string[];
}

export interface LeagueGroupClanDto {
  tag: string;
  name: string;
  leagueId: number;
}

export interface ClanBadge {
  large: string;
  small: string;
  medium: string;
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
  state: string;
  startTime: string;
  preparationStartTime: string;
  endTime: string;
  battleModifier?: string | null;
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

export interface RosterMemberOfRostersEntity {
  warPreference: string;
  categoryId?: string | null;
  name: string;
  tag: string;
  userId: string | null;
  username: string | null;
  role: string | null;
  townHallLevel: number;
  heroes: object;
  trophies: number;
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
  category: string;
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
  allowCategorySelection?: boolean;
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
  selectable: boolean;
  roleId?: string | null;
  /** @format date-time */
  createdAt: string;
}

export interface GetRostersDto {
  rosters: RostersEntity[];
  categories: RosterGroupsEntity[];
}

export interface RemoveMembersBulkInput {
  /** @minItems 1 */
  playerTags: string[];
}

export interface TransferRosterMembersInput {
  /** @minItems 1 */
  playerTags: string[];
  newRosterId: string;
  newGroupId: string;
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

export interface GuildClanDto {
  _id: string;
  categoryId?: string | null;
  name: string;
  tag: string;
  order: number;
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
  clans: GuildClanDto[];
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

export interface ListMemberDto {
  id: string;
  username: string;
  displayName: string;
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

export type LinkData = ResultOkDto;

export type LinkError = ErrorResponseDto;

export interface UnlinkParams {
  playerTag: string;
}

export type UnlinkData = ResultOkDto;

export type UnlinkError = ErrorResponseDto;

export type GetLinksData = LinksDto[];

export type GetLinksError = ErrorResponseDto;

export interface GetLastSeenParams {
  clanTag: string;
}

export type GetLastSeenData = LastSeenDto;

export type GetLastSeenError = ErrorResponseDto;

export interface GetClanHistoryParams {
  playerTag: string;
}

export type GetClanHistoryData = ClanHistoryItemsDto;

export type GetClanHistoryError = ErrorResponseDto;

export interface GetAttackHistoryParams {
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  startDate: string;
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

export type AggregateClanWarLeagueHistoryData =
  AggregateClanWarLeagueHistoryItemsDto;

export type AggregateClanWarLeagueHistoryError = ErrorResponseDto;

export interface AddPlayerAccountParams {
  playerTag: string;
}

export type AddPlayerAccountData = ResultOkDto;

export type AddPlayerAccountError = ErrorResponseDto;

export type GetLegendRankingThresholdsData = LegendRankingThresholdsDto;

export type GetLegendRankingThresholdsError = ErrorResponseDto;

export type GetLeaderboardData = LeaderboardByTagsItemsDto;

export type GetLeaderboardError = ErrorResponseDto;

export type GetLegendAttacksData = LegendAttacksItemsDto;

export type GetLegendAttacksError = ErrorResponseDto;

export interface GetLegendAttacksByPlayerTagParams {
  playerTag: string;
}

export type GetLegendAttacksByPlayerTagData = LegendAttacksDto;

export type GetLegendAttacksByPlayerTagError = ErrorResponseDto;

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

export interface GetClanWarParams {
  clanTag: string;
  warId: string;
}

export type GetClanWarData = ClanWarDto;

export type GetClanWarError = ErrorResponseDto;

export interface GetRostersParams {
  guildId: string;
}

export type GetRostersData = GetRostersDto;

export type GetRostersError = ErrorResponseDto;

export interface CreateRosterParams {
  rosterId: string;
  guildId: string;
}

export type CreateRosterData = object;

export type CreateRosterError = ErrorResponseDto;

export interface GetRosterParams {
  rosterId: string;
  guildId: string;
}

export type GetRosterData = RostersEntity;

export type GetRosterError = ErrorResponseDto;

export interface UpdateRosterParams {
  rosterId: string;
  guildId: string;
}

export type UpdateRosterData = object;

export type UpdateRosterError = ErrorResponseDto;

export interface DeleteRosterParams {
  rosterId: string;
  guildId: string;
}

export type DeleteRosterData = object;

export type DeleteRosterError = ErrorResponseDto;

export interface CloneRosterParams {
  rosterId: string;
  guildId: string;
}

export type CloneRosterData = object;

export type CloneRosterError = ErrorResponseDto;

export interface AddRosterMembersParams {
  rosterId: string;
  guildId: string;
}

export type AddRosterMembersData = object;

export type AddRosterMembersError = ErrorResponseDto;

export interface DeleteRosterMembersParams {
  rosterId: string;
  guildId: string;
}

export type DeleteRosterMembersData = object;

export type DeleteRosterMembersError = ErrorResponseDto;

export interface RefreshRosterMembersParams {
  rosterId: string;
  guildId: string;
}

export type RefreshRosterMembersData = object;

export type RefreshRosterMembersError = ErrorResponseDto;

export interface TransferRosterMembersParams {
  rosterId: string;
  guildId: string;
}

export type TransferRosterMembersData = TransferRosterMembersDto;

export type TransferRosterMembersError = ErrorResponseDto;

export interface GetUserParams {
  userId: string;
}

export type GetUserData = object;

export type GetUserError = ErrorResponseDto;

export interface GetGuildClansParams {
  guildId: string;
}

export type GetGuildClansData = GuildClansDto;

export type GetGuildClansError = ErrorResponseDto;

export interface ReorderGuildClansParams {
  guildId: string;
}

export type ReorderGuildClansData = GuildClansDto;

export type ReorderGuildClansError = ErrorResponseDto;

export interface ListMembersParams {
  query: string;
  guildId: string;
}

export type ListMembersData = ListMemberDto[];

export type ListMembersError = ErrorResponseDto;

export type ExportClanMembersData = ExportMembersOutputDto;

export type ExportClanMembersError = ErrorResponseDto;

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
   * @description ``` You can send either "playerTags" or "userIds", not both or none. Max size is 100. ```
   * @tags Links
   * @name GetLinks
   * @summary Get links by playerTags or userIds
   * @request POST:/links/query
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
}

export namespace Clans {
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
}

export namespace Players {
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
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      startDate: string;
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
   * @name GetLeaderboard
   * @request POST:/legends/leaderboard/query
   * @secure
   * @response `201` `GetLeaderboardData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetLeaderboard {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LeaderboardByTagsInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetLeaderboardData;
  }

  /**
   * No description
   * @tags Legends
   * @name GetLegendAttacks
   * @request POST:/legends/attacks/query
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
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLegendAttacksByPlayerTagData;
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
      rosterId: string;
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CreateRosterData;
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
      rosterId: string;
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateRosterData;
  }

  /**
   * No description
   * @tags Rosters
   * @name DeleteRoster
   * @request DELETE:/rosters/{guildId}/{rosterId}
   * @secure
   * @response `200` `DeleteRosterData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace DeleteRoster {
    export type RequestParams = {
      rosterId: string;
      guildId: string;
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
      rosterId: string;
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CloneRosterData;
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
      rosterId: string;
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
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
      rosterId: string;
      guildId: string;
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
   * @name GetUser
   * @request GET:/users/{userId}
   * @secure
   * @response `200` `GetUserData`
   * @response `500` `ErrorResponseDto`
   */
  export namespace GetUser {
    export type RequestParams = {
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserData;
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
}

export namespace Exports {
  /**
   * No description
   * @tags Exports
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

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
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

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
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
      baseURL: axiosConfig.baseURL || "/v1",
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
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
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
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
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
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title ClashPerk Discord Bot API
 * @version v2.0.1
 * @baseUrl /v1
 * @contact
 *
 * ### API Routes for ClashPerk Discord Bot and Services
 *
 * API endpoints are protected by **Cloudflare** with a global rate limit of **300 requests per 10 seconds**.<br/>Response **caching is enabled**, with duration varying across different endpoints for optimal performance.<br/>API **access is limited** and reviewed individually. If you'd like to request access, reach out to us on Discord.
 *
 * By using this API, you agree to fair usage. Access may be revoked for abuse, misuse, or security violations.
 *
 * [Join our Discord](https://discord.gg/ppuppun) | [Terms of Service](https://clashperk.com/terms) | [Privacy Policy](https://clashperk.com/privacy)
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
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
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
    generatePasskey: (
      data: GenerateTokenInputDto,
      params: RequestParams = {},
    ) =>
      this.http.request<GeneratePasskeyData, GeneratePasskeyError>({
        path: `/auth/generate-passkey`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
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
    getAuthUser: (
      { userId, ...query }: GetAuthUserParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetAuthUserData, GetAuthUserError>({
        path: `/auth/users/${userId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
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
    decodeHandoffToken: (
      { token, ...query }: DecodeHandoffTokenParams,
      params: RequestParams = {},
    ) =>
      this.http.request<DecodeHandoffTokenData, DecodeHandoffTokenError>({
        path: `/auth/handoff/${token}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
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
    createHandoffToken: (
      data: HandoffTokenInputDto,
      params: RequestParams = {},
    ) =>
      this.http.request<CreateHandoffTokenData, CreateHandoffTokenError>({
        path: `/auth/handoff`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
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
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
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
    unlink: (
      { playerTag, ...query }: UnlinkParams,
      params: RequestParams = {},
    ) =>
      this.http.request<UnlinkData, UnlinkError>({
        path: `/links/${playerTag}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description ``` You can send either "playerTags" or "userIds", not both or none. Max size is 100. ```
     *
     * @tags Links
     * @name GetLinks
     * @summary Get links by playerTags or userIds
     * @request POST:/links/query
     * @secure
     * @response `200` `GetLinksData`
     * @response `500` `ErrorResponseDto`
     */
    getLinks: (data: GetLinksInputDto, params: RequestParams = {}) =>
      this.http.request<GetLinksData, GetLinksError>({
        path: `/links/query`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  clans = {
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
    getLastSeen: (
      { clanTag, ...query }: GetLastSeenParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetLastSeenData, GetLastSeenError>({
        path: `/clans/${clanTag}/lastseen`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  players = {
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
    getClanHistory: (
      { playerTag, ...query }: GetClanHistoryParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetClanHistoryData, GetClanHistoryError>({
        path: `/players/${playerTag}/history`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
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
      params: RequestParams = {},
    ) =>
      this.http.request<GetAttackHistoryData, GetAttackHistoryError>({
        path: `/players/${playerTag}/wars`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
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
      params: RequestParams = {},
    ) =>
      this.http.request<
        AggregateAttackHistoryData,
        AggregateAttackHistoryError
      >({
        path: `/players/${playerTag}/wars/aggregate`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
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
      params: RequestParams = {},
    ) =>
      this.http.request<
        AggregateClanWarLeagueHistoryData,
        AggregateClanWarLeagueHistoryError
      >({
        path: `/players/${playerTag}/clan-war-leagues/aggregate`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
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
    addPlayerAccount: (
      { playerTag, ...query }: AddPlayerAccountParams,
      params: RequestParams = {},
    ) =>
      this.http.request<AddPlayerAccountData, AddPlayerAccountError>({
        path: `/players/${playerTag}`,
        method: "PUT",
        secure: true,
        format: "json",
        ...params,
      }),
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
      this.http.request<
        GetLegendRankingThresholdsData,
        GetLegendRankingThresholdsError
      >({
        path: `/legends/ranking-thresholds`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Legends
     * @name GetLeaderboard
     * @request POST:/legends/leaderboard/query
     * @secure
     * @response `201` `GetLeaderboardData`
     * @response `500` `ErrorResponseDto`
     */
    getLeaderboard: (
      data: LeaderboardByTagsInputDto,
      params: RequestParams = {},
    ) =>
      this.http.request<GetLeaderboardData, GetLeaderboardError>({
        path: `/legends/leaderboard/query`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Legends
     * @name GetLegendAttacks
     * @request POST:/legends/attacks/query
     * @secure
     * @response `200` `GetLegendAttacksData`
     * @response `500` `ErrorResponseDto`
     */
    getLegendAttacks: (
      data: GetLegendAttacksInputDto,
      params: RequestParams = {},
    ) =>
      this.http.request<GetLegendAttacksData, GetLegendAttacksError>({
        path: `/legends/attacks/query`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
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
      params: RequestParams = {},
    ) =>
      this.http.request<
        GetLegendAttacksByPlayerTagData,
        GetLegendAttacksByPlayerTagError
      >({
        path: `/legends/${playerTag}/attacks`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
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
      { clanTag, ...query }: GetClanWarLeagueGroupsParams,
      params: RequestParams = {},
    ) =>
      this.http.request<
        GetClanWarLeagueGroupsData,
        GetClanWarLeagueGroupsError
      >({
        path: `/wars/${clanTag}/clan-war-leagues/groups`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
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
      { clanTag, ...query }: GetClanWarLeagueForClanParams,
      params: RequestParams = {},
    ) =>
      this.http.request<
        GetClanWarLeagueForClanData,
        GetClanWarLeagueForClanError
      >({
        path: `/wars/${clanTag}/clan-war-leagues/clan`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
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
    getClanWar: (
      { clanTag, warId, ...query }: GetClanWarParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetClanWarData, GetClanWarError>({
        path: `/wars/${clanTag}/${warId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
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
    getRosters: (
      { guildId, ...query }: GetRostersParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetRostersData, GetRostersError>({
        path: `/rosters/${guildId}/list`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
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
      { rosterId, guildId, ...query }: CreateRosterParams,
      params: RequestParams = {},
    ) =>
      this.http.request<CreateRosterData, CreateRosterError>({
        path: `/rosters/${guildId}/create`,
        method: "POST",
        secure: true,
        format: "json",
        ...params,
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
    getRoster: (
      { rosterId, guildId, ...query }: GetRosterParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetRosterData, GetRosterError>({
        path: `/rosters/${guildId}/${rosterId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
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
      { rosterId, guildId, ...query }: UpdateRosterParams,
      params: RequestParams = {},
    ) =>
      this.http.request<UpdateRosterData, UpdateRosterError>({
        path: `/rosters/${guildId}/${rosterId}`,
        method: "PATCH",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Rosters
     * @name DeleteRoster
     * @request DELETE:/rosters/{guildId}/{rosterId}
     * @secure
     * @response `200` `DeleteRosterData`
     * @response `500` `ErrorResponseDto`
     */
    deleteRoster: (
      { rosterId, guildId, ...query }: DeleteRosterParams,
      params: RequestParams = {},
    ) =>
      this.http.request<DeleteRosterData, DeleteRosterError>({
        path: `/rosters/${guildId}/${rosterId}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
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
      { rosterId, guildId, ...query }: CloneRosterParams,
      params: RequestParams = {},
    ) =>
      this.http.request<CloneRosterData, CloneRosterError>({
        path: `/rosters/${guildId}/${rosterId}/clone`,
        method: "POST",
        secure: true,
        format: "json",
        ...params,
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
      { rosterId, guildId, ...query }: AddRosterMembersParams,
      params: RequestParams = {},
    ) =>
      this.http.request<AddRosterMembersData, AddRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members`,
        method: "PUT",
        secure: true,
        format: "json",
        ...params,
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
      { rosterId, guildId, ...query }: DeleteRosterMembersParams,
      data: RemoveMembersBulkInput,
      params: RequestParams = {},
    ) =>
      this.http.request<DeleteRosterMembersData, DeleteRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members`,
        method: "DELETE",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
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
      { rosterId, guildId, ...query }: RefreshRosterMembersParams,
      params: RequestParams = {},
    ) =>
      this.http.request<RefreshRosterMembersData, RefreshRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members/refresh`,
        method: "POST",
        secure: true,
        format: "json",
        ...params,
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
      { rosterId, guildId, ...query }: TransferRosterMembersParams,
      data: TransferRosterMembersInput,
      params: RequestParams = {},
    ) =>
      this.http.request<TransferRosterMembersData, TransferRosterMembersError>({
        path: `/rosters/${guildId}/${rosterId}/members/transfer`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  users = {
    /**
     * No description
     *
     * @tags Users
     * @name GetUser
     * @request GET:/users/{userId}
     * @secure
     * @response `200` `GetUserData`
     * @response `500` `ErrorResponseDto`
     */
    getUser: (
      { userId, ...query }: GetUserParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetUserData, GetUserError>({
        path: `/users/${userId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
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
    getGuildClans: (
      { guildId, ...query }: GetGuildClansParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetGuildClansData, GetGuildClansError>({
        path: `/guilds/${guildId}/clans`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
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
      { guildId, ...query }: ReorderGuildClansParams,
      data: ReorderClanCategoriesInput,
      params: RequestParams = {},
    ) =>
      this.http.request<ReorderGuildClansData, ReorderGuildClansError>({
        path: `/guilds/${guildId}/clans/reorder`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
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
    listMembers: (
      { guildId, ...query }: ListMembersParams,
      params: RequestParams = {},
    ) =>
      this.http.request<ListMembersData, ListMembersError>({
        path: `/guilds/${guildId}/members/list`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  exports = {
    /**
     * No description
     *
     * @tags Exports
     * @name ExportClanMembers
     * @request POST:/exports/members
     * @response `201` `ExportClanMembersData`
     * @response `500` `ErrorResponseDto`
     */
    exportClanMembers: (data: ExportMembersInput, params: RequestParams = {}) =>
      this.http.request<ExportClanMembersData, ExportClanMembersError>({
        path: `/exports/members`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
}
