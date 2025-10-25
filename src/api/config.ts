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

/** Regular = 1, Friendly = 2, CWL = 3 */
export enum WarTypes {
  Value1 = 1,
  Value2 = 2,
  Value3 = 3,
}

export enum UserRoles {
  User = "user",
  Admin = "admin",
  Viewer = "viewer",
  FetchWars = "fetch:wars",
  FetchClans = "fetch:clans",
  FetchPlayers = "fetch:players",
  FetchLegends = "fetch:legends",
  FetchLinks = "fetch:links",
  ManageLinks = "manage:links",
  ManageRosters = "manage:rosters",
  ManageReminders = "manage:reminders",
}

export interface LoginInputDto {
  passKey: string;
}

export interface LoginOkDto {
  /** @default ["user","admin","viewer","fetch:wars","fetch:clans","fetch:players","fetch:legends","fetch:links","manage:links","manage:rosters","manage:reminders"] */
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
  /** @default ["user","admin","viewer","fetch:wars","fetch:clans","fetch:players","fetch:legends","fetch:links","manage:links","manage:rosters","manage:reminders"] */
  roles: UserRoles[];
  userId: string;
  accessToken: string;
  passKey: string;
  isBot: boolean;
  displayName: string;
}

export interface AuthUserDto {
  /** @default ["user","admin","viewer","fetch:wars","fetch:clans","fetch:players","fetch:legends","fetch:links","manage:links","manage:rosters","manage:reminders"] */
  roles: UserRoles[];
  userId: string;
  displayName: string;
  isBot: boolean;
}

export interface HandoffUserDto {
  /** @default ["user","admin","viewer","fetch:wars","fetch:clans","fetch:players","fetch:legends","fetch:links","manage:links","manage:rosters","manage:reminders"] */
  roles: UserRoles[];
  userId: string;
  displayName: string;
  isBot: boolean;
  avatarUrl: string | null;
}

export interface HandoffTokenInputDto {
  userId: string;
  guildId: string;
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

export interface CreateLinkInputDto {
  playerTag: string;
  userId: string;
  apiToken: string | null;
}

export interface GetLinksInputDto {
  /**
   * @maxItems 100
   * @minItems 1
   * @example ["#2PP"]
   */
  playerTags: string[];
  /**
   * @maxItems 100
   * @minItems 1
   * @example ["444432489818357760"]
   */
  userIds: string[];
}

export interface LinksDto {
  tag: string;
  name: string;
  userId: string;
  username: string;
  verified: boolean;
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
  destructionPercentage: number;
}

export interface AttackHistoryDto {
  /** Regular = 1, Friendly = 2, CWL = 3 */
  warType: WarTypes;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  attacks: AttackRecordDto[];
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
  totalWars: number;
  totalAttacks: number;
  total3Stars: number;
  totalMissed: number;
  totalStars: number;
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

export interface ClanDto {
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
  battleModifier?: string;
  teamSize: number;
  startTime: string;
  preparationStartTime: string;
  endTime: string;
  clan: WarClanDto;
  opponent: WarClanDto;
  attacksPerMember?: number;
  round: number;
  warTag: string;
}

export interface ClanWarLeaguesDto {
  season: string;
  rounds: ClanWarLeagueRound[];
  clans: ClanDto[];
  wars: ClanWarDto[];
}

export type LoginData = LoginOkDto;

export type GenerateTokenData = GenerateTokenDto;

export interface GetAuthUserParams {
  userId: string;
}

export type GetAuthUserData = AuthUserDto;

export interface DecodeHandoffTokenParams {
  token: string;
}

export type DecodeHandoffTokenData = HandoffUserDto;

export type CreateHandoffTokenData = any;

export interface GetLastSeenParams {
  clanTag: string;
}

export type GetLastSeenData = LastSeenDto;

export type ExportClanMembersData = any;

export interface GetGuildSettingsParams {
  guildId: string;
}

export type GetGuildSettingsData = any;

export type LinkData = any;

export interface UnlinkParams {
  playerTag: string;
}

export type UnlinkData = any;

export type GetLinksData = LinksDto[];

export interface GetCommandsUsageLogsParams {
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  startDate?: string;
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  endDate?: string;
  userId?: string;
  guildId?: string;
  commandId?: string;
  query?: string;
  /**
   * @min 1
   * @max 1000
   * @default 100
   */
  limit: number;
  /**
   * @min 0
   * @default 0
   */
  offset: number;
}

export type GetCommandsUsageLogsData = CommandsUsageLogItemsDto;

export interface GetClanHistoryParams {
  playerTag: string;
}

export type GetClanHistoryData = ClanHistoryItemsDto;

export interface GetAttackHistoryParams {
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  startDate?: string;
  playerTag: string;
}

export type GetAttackHistoryData = AttackHistoryItemsDto;

export interface AggregateAttackHistoryParams {
  /**
   * Date string or timestamp in milliseconds
   * @format date-time
   */
  startDate?: string;
  playerTag: string;
}

export type AggregateAttackHistoryData = AggregateAttackHistoryDto;

export interface AddPlayerAccountParams {
  playerTag: string;
}

export type AddPlayerAccountData = any;

export type GetLegendRankingThresholdsData = LegendRankingThresholdsDto;

export type GetLeaderboardData = LeaderboardByTagsItemsDto;

export type GetLegendAttacksData = LegendAttacksItemsDto;

export interface GetLegendAttacksByPlayerTagParams {
  playerTag: string;
}

export type GetLegendAttacksByPlayerTagData = LegendAttacksDto;

export interface GetRosterParams {
  rosterId: string;
}

export type GetRosterData = any;

export type BulkAddLegendPlayersData = any;

export type SeedLegendPlayersData = object;

export interface GetUserParams {
  userId: string;
}

export type GetUserData = any;

export interface GetClanWarLeagueGroupsParams {
  clanTag: string;
}

export type GetClanWarLeagueGroupsData = ClanWarLeaguesDto;

export interface GetClanWarLeagueForClanParams {
  clanTag: string;
}

export type GetClanWarLeagueForClanData = ClanWarLeaguesDto;

export interface HandleDiscordInteractionsParams {
  message: string;
}

export type HandleDiscordInteractionsData = object;

export type HandlePatreonWebhookData = any;

export namespace Auth {
  /**
   * No description
   * @tags Auth
   * @name Login
   * @summary Authenticates a user and returns login information.
   * @request POST:/auth/login
   * @response `201` `LoginData`
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
   * @name GenerateToken
   * @summary Generates a JWT token with specified user roles.
   * @request POST:/auth/generate-token
   * @secure
   * @response `201` `GenerateTokenData`
   */
  export namespace GenerateToken {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GenerateTokenInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateTokenData;
  }

  /**
   * No description
   * @tags Auth
   * @name GetAuthUser
   * @summary Retrieves authenticated user information based on userId.
   * @request GET:/auth/users/{userId}
   * @secure
   * @response `200` `GetAuthUserData`
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
   */
  export namespace CreateHandoffToken {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = HandoffTokenInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = CreateHandoffTokenData;
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

export namespace Exports {
  /**
   * No description
   * @tags Exports
   * @name ExportClanMembers
   * @request POST:/exports/members
   * @response `201` `ExportClanMembersData`
   */
  export namespace ExportClanMembers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ExportClanMembersData;
  }
}

export namespace Guilds {
  /**
   * No description
   * @tags Guilds
   * @name GetGuildSettings
   * @request GET:/guilds/{guildId}/settings
   * @secure
   * @response `200` `GetGuildSettingsData`
   */
  export namespace GetGuildSettings {
    export type RequestParams = {
      guildId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetGuildSettingsData;
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
   */
  export namespace GetLinks {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GetLinksInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = GetLinksData;
  }
}

export namespace Metrics {
  /**
   * No description
   * @tags Metrics
   * @name GetCommandsUsageLogs
   * @request GET:/metrics/commands-usage-logs
   * @secure
   * @response `200` `GetCommandsUsageLogsData`
   */
  export namespace GetCommandsUsageLogs {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      startDate?: string;
      /**
       * Date string or timestamp in milliseconds
       * @format date-time
       */
      endDate?: string;
      userId?: string;
      guildId?: string;
      commandId?: string;
      query?: string;
      /**
       * @min 1
       * @max 1000
       * @default 100
       */
      limit: number;
      /**
       * @min 0
       * @default 0
       */
      offset: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCommandsUsageLogsData;
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
      startDate?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AggregateAttackHistoryData;
  }

  /**
   * No description
   * @tags Players
   * @name AddPlayerAccount
   * @request PUT:/players/{playerTag}
   * @secure
   * @response `200` `AddPlayerAccountData`
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
   * @response `200` `GetLegendRankingThresholdsData`
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
   * @response `201` `GetLeaderboardData`
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
   * @response `200` `GetLegendAttacksData`
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
   * @response `200` `GetLegendAttacksByPlayerTagData`
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

export namespace Rosters {
  /**
   * No description
   * @tags Rosters
   * @name GetRoster
   * @request GET:/rosters/{rosterId}
   * @response `200` `GetRosterData`
   */
  export namespace GetRoster {
    export type RequestParams = {
      rosterId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetRosterData;
  }
}

export namespace Tasks {
  /**
   * No description
   * @tags Tasks
   * @name BulkAddLegendPlayers
   * @request POST:/tasks/bulk-add-legend-players
   * @secure
   * @response `201` `BulkAddLegendPlayersData`
   */
  export namespace BulkAddLegendPlayers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = BulkAddLegendPlayersData;
  }

  /**
   * No description
   * @tags Tasks
   * @name SeedLegendPlayers
   * @request POST:/tasks/seed-legend-players
   * @secure
   * @response `201` `SeedLegendPlayersData`
   */
  export namespace SeedLegendPlayers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SeedLegendPlayersData;
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

export namespace Wars {
  /**
   * No description
   * @tags Wars
   * @name GetClanWarLeagueGroups
   * @request GET:/wars/{clanTag}/clan-war-leagues/groups
   * @secure
   * @response `200` `GetClanWarLeagueGroupsData`
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
}

export namespace Webhook {
  /**
   * No description
   * @tags Webhook
   * @name HandleDiscordInteractions
   * @request POST:/webhook/discord/interactions
   * @response `200` `HandleDiscordInteractionsData`
   */
  export namespace HandleDiscordInteractions {
    export type RequestParams = {};
    export type RequestQuery = {
      message: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {
      "X-Signature-Ed25519": string;
      "X-Signature-Timestamp": string;
    };
    export type ResponseBody = HandleDiscordInteractionsData;
  }

  /**
   * No description
   * @tags Webhook
   * @name HandlePatreonWebhook
   * @request POST:/webhook/patreon/incoming
   * @response `201` `HandlePatreonWebhookData`
   */
  export namespace HandlePatreonWebhook {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = HandlePatreonWebhookData;
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
 * @version v1
 * @baseUrl /v1
 * @contact
 *
 * ### API Routes for ClashPerk Discord Bot and Services
 *
 * API endpoints are protected by **Cloudflare** with a global rate limit of **300 requests per 10 seconds**.<br/>Response **caching is enabled**, with duration varying across different endpoints for optimal performance.<br/>API **access is limited** and reviewed individually. If you'd like to request access, reach out to us on Discord.
 *
 * By using this API, you agree to fair usage. Access may be revoked for abuse, misuse, or security violations.
 *
 *
 * <details>
 * <summary>
 * API Versioning and Deprecation Notice
 * </summary>
 *
 * You're viewing the upcoming API, which is currently under active development and may undergo changes before its stable release.<br/>The legacy API is unversioned and remains fully maintained at [https://api-legacy.clashperk.com/docs](https://api-legacy.clashperk.com/docs) until December 2025.<br/>The upcoming API is formally versioned, starting with `/v1` (example request: GET `/v1/clans/{clanTag}`). Please ensure you migrate to this API before that date to avoid disruption.
 * </details>
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
     * No description
     *
     * @tags Auth
     * @name Login
     * @summary Authenticates a user and returns login information.
     * @request POST:/auth/login
     * @response `201` `LoginData`
     */
    login: (data: LoginInputDto, params: RequestParams = {}) =>
      this.http.request<LoginData, any>({
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
     * @name GenerateToken
     * @summary Generates a JWT token with specified user roles.
     * @request POST:/auth/generate-token
     * @secure
     * @response `201` `GenerateTokenData`
     */
    generateToken: (data: GenerateTokenInputDto, params: RequestParams = {}) =>
      this.http.request<GenerateTokenData, any>({
        path: `/auth/generate-token`,
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
     * @summary Retrieves authenticated user information based on userId.
     * @request GET:/auth/users/{userId}
     * @secure
     * @response `200` `GetAuthUserData`
     */
    getAuthUser: (
      { userId, ...query }: GetAuthUserParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetAuthUserData, any>({
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
     */
    decodeHandoffToken: (
      { token, ...query }: DecodeHandoffTokenParams,
      params: RequestParams = {},
    ) =>
      this.http.request<DecodeHandoffTokenData, any>({
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
     */
    createHandoffToken: (
      data: HandoffTokenInputDto,
      params: RequestParams = {},
    ) =>
      this.http.request<CreateHandoffTokenData, any>({
        path: `/auth/handoff`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
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
     */
    getLastSeen: (
      { clanTag, ...query }: GetLastSeenParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetLastSeenData, any>({
        path: `/clans/${clanTag}/lastseen`,
        method: "GET",
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
     */
    exportClanMembers: (params: RequestParams = {}) =>
      this.http.request<ExportClanMembersData, any>({
        path: `/exports/members`,
        method: "POST",
        ...params,
      }),
  };
  guilds = {
    /**
     * No description
     *
     * @tags Guilds
     * @name GetGuildSettings
     * @request GET:/guilds/{guildId}/settings
     * @secure
     * @response `200` `GetGuildSettingsData`
     */
    getGuildSettings: (
      { guildId, ...query }: GetGuildSettingsParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetGuildSettingsData, any>({
        path: `/guilds/${guildId}/settings`,
        method: "GET",
        secure: true,
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
     */
    link: (data: CreateLinkInputDto, params: RequestParams = {}) =>
      this.http.request<LinkData, any>({
        path: `/links`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
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
     */
    unlink: (
      { playerTag, ...query }: UnlinkParams,
      params: RequestParams = {},
    ) =>
      this.http.request<UnlinkData, any>({
        path: `/links/${playerTag}`,
        method: "DELETE",
        secure: true,
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
     */
    getLinks: (data: GetLinksInputDto, params: RequestParams = {}) =>
      this.http.request<GetLinksData, any>({
        path: `/links/query`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  metrics = {
    /**
     * No description
     *
     * @tags Metrics
     * @name GetCommandsUsageLogs
     * @request GET:/metrics/commands-usage-logs
     * @secure
     * @response `200` `GetCommandsUsageLogsData`
     */
    getCommandsUsageLogs: (
      query: GetCommandsUsageLogsParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetCommandsUsageLogsData, any>({
        path: `/metrics/commands-usage-logs`,
        method: "GET",
        query: query,
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
     */
    getClanHistory: (
      { playerTag, ...query }: GetClanHistoryParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetClanHistoryData, any>({
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
     */
    getAttackHistory: (
      { playerTag, ...query }: GetAttackHistoryParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetAttackHistoryData, any>({
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
     */
    aggregateAttackHistory: (
      { playerTag, ...query }: AggregateAttackHistoryParams,
      params: RequestParams = {},
    ) =>
      this.http.request<AggregateAttackHistoryData, any>({
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
     * @name AddPlayerAccount
     * @request PUT:/players/{playerTag}
     * @secure
     * @response `200` `AddPlayerAccountData`
     */
    addPlayerAccount: (
      { playerTag, ...query }: AddPlayerAccountParams,
      params: RequestParams = {},
    ) =>
      this.http.request<AddPlayerAccountData, any>({
        path: `/players/${playerTag}`,
        method: "PUT",
        secure: true,
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
     * @response `200` `GetLegendRankingThresholdsData`
     */
    getLegendRankingThresholds: (params: RequestParams = {}) =>
      this.http.request<GetLegendRankingThresholdsData, any>({
        path: `/legends/ranking-thresholds`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Legends
     * @name GetLeaderboard
     * @request POST:/legends/leaderboard/query
     * @response `201` `GetLeaderboardData`
     */
    getLeaderboard: (
      data: LeaderboardByTagsInputDto,
      params: RequestParams = {},
    ) =>
      this.http.request<GetLeaderboardData, any>({
        path: `/legends/leaderboard/query`,
        method: "POST",
        body: data,
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
     * @response `200` `GetLegendAttacksData`
     */
    getLegendAttacks: (
      data: GetLegendAttacksInputDto,
      params: RequestParams = {},
    ) =>
      this.http.request<GetLegendAttacksData, any>({
        path: `/legends/attacks/query`,
        method: "POST",
        body: data,
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
     * @response `200` `GetLegendAttacksByPlayerTagData`
     */
    getLegendAttacksByPlayerTag: (
      { playerTag, ...query }: GetLegendAttacksByPlayerTagParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetLegendAttacksByPlayerTagData, any>({
        path: `/legends/${playerTag}/attacks`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  rosters = {
    /**
     * No description
     *
     * @tags Rosters
     * @name GetRoster
     * @request GET:/rosters/{rosterId}
     * @response `200` `GetRosterData`
     */
    getRoster: (
      { rosterId, ...query }: GetRosterParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetRosterData, any>({
        path: `/rosters/${rosterId}`,
        method: "GET",
        ...params,
      }),
  };
  tasks = {
    /**
     * No description
     *
     * @tags Tasks
     * @name BulkAddLegendPlayers
     * @request POST:/tasks/bulk-add-legend-players
     * @secure
     * @response `201` `BulkAddLegendPlayersData`
     */
    bulkAddLegendPlayers: (params: RequestParams = {}) =>
      this.http.request<BulkAddLegendPlayersData, any>({
        path: `/tasks/bulk-add-legend-players`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Tasks
     * @name SeedLegendPlayers
     * @request POST:/tasks/seed-legend-players
     * @secure
     * @response `201` `SeedLegendPlayersData`
     */
    seedLegendPlayers: (params: RequestParams = {}) =>
      this.http.request<SeedLegendPlayersData, any>({
        path: `/tasks/seed-legend-players`,
        method: "POST",
        secure: true,
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
     */
    getUser: (
      { userId, ...query }: GetUserParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetUserData, any>({
        path: `/users/${userId}`,
        method: "GET",
        secure: true,
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
     */
    getClanWarLeagueGroups: (
      { clanTag, ...query }: GetClanWarLeagueGroupsParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetClanWarLeagueGroupsData, any>({
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
     */
    getClanWarLeagueForClan: (
      { clanTag, ...query }: GetClanWarLeagueForClanParams,
      params: RequestParams = {},
    ) =>
      this.http.request<GetClanWarLeagueForClanData, any>({
        path: `/wars/${clanTag}/clan-war-leagues/clan`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  webhook = {
    /**
     * No description
     *
     * @tags Webhook
     * @name HandleDiscordInteractions
     * @request POST:/webhook/discord/interactions
     * @response `200` `HandleDiscordInteractionsData`
     */
    handleDiscordInteractions: (
      query: HandleDiscordInteractionsParams,
      params: RequestParams = {},
    ) =>
      this.http.request<HandleDiscordInteractionsData, any>({
        path: `/webhook/discord/interactions`,
        method: "POST",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Webhook
     * @name HandlePatreonWebhook
     * @request POST:/webhook/patreon/incoming
     * @response `201` `HandlePatreonWebhookData`
     */
    handlePatreonWebhook: (params: RequestParams = {}) =>
      this.http.request<HandlePatreonWebhookData, any>({
        path: `/webhook/patreon/incoming`,
        method: "POST",
        ...params,
      }),
  };
}
