export interface SettingsEntity {
  guildId: string;
  commandWhitelist?: {
    key: string;
    userOrRoleId: string;
    commandId: string;
    isRole: boolean;
  }[];
  rosterManagerRole?: string | string[];
  color?: number;
  hasFlagAlertLog?: boolean;
  clanCategoryExclusion?: string[];
  roleRemovalDelays?: number;
  roleAdditionDelays?: number;
  webhookLimit?: number;
  nonFamilyNicknameFormat?: string;
  familyNicknameFormat?: string;
  useAutoRole?: boolean;
  linkEmbeds?: {
    title: string;
    description: string;
    token_field: string;
    thumbnail_url: string;
  };
  verifiedOnlyClanRoles?: boolean;
  autoNickname?: boolean;
  accountVerifiedRole?: string;
  clansSortingKey?: string;
  rosterDefaultSettings?: {
    allowMultiSignup: boolean;
    allowCategorySelection: boolean;
    maxMembers: number;
    minHeroLevels: number | null;
    minTownHall: number | null;
    maxTownHall: number | null;
    sortBy: string;
    allowUnlinked: boolean;
    layout: string;
    colorCode: number;
    useClanAlias: boolean;
  };
  roleRefreshed?: number;
  clanLimit?: number;
  allowExternalAccounts?: boolean;
  allowExternalAccountsLeague?: boolean;
  leagueRoles?: Record<string, string>;
  townHallRoles?: Record<string, string>;
  builderHallRoles?: Record<string, string>;
  forceRefreshRoles?: boolean;
  familyRole?: string;
  roleReplacementLabels?: {
    leader: string;
    coLeader: string;
    admin: string;
    member: string;
  };
  reminderExclusion?: {
    type: string;
    wars: string;
    raids: string;
    games: string;
    warsExclusionUserIds: string[];
    raidsExclusionUserIds: string[];
    gamesExclusionUserIds: string[];
  };
  isTrustedGuild?: boolean;
  nicknamingAccountPreference?: string;
  refreshEmbeds?: {
    title: string;
    description: string;
    thumbnailUrl: string;
    image_url: string;
    thumbnail_url: string;
  };
  eosPushClanRoles?: string[];
  eosPushClans?: string[];
  rosterChangeLog?: {
    channelId: string;
    webhook: {
      token: string;
      id: string;
    };
  };
}
