export const MembersCommandOptions = {
  heroes: {
    id: 'heroes',
    label: 'Heroes/War Weight',
    description: 'Heroes and Town Hall levels of the clan members.'
  },
  discord: {
    id: 'link-list',
    label: 'Discord Links',
    description: 'Discord links of the clan members.'
  },
  warPref: {
    id: 'war-pref',
    label: 'War Preferences',
    description: 'War preferences of the clan members.'
  },
  tags: {
    id: 'tags',
    label: 'Player Tags and Roles',
    description: 'Player Tags and Roles of the clan members.'
  },
  trophies: {
    id: 'trophies',
    label: 'Trophies',
    description: 'Trophies of the clan members.'
  },
  joinDate: {
    id: 'join-date',
    label: 'Last Joining Date',
    description: 'Last joining and leave/join count of the clan members.'
  },
  progress: {
    id: 'progress',
    label: 'Player Progress',
    description: 'Player progress of the clan members.'
  },
  attacks: {
    id: 'attacks',
    label: 'Attacks & Defenses',
    description: 'Attacks and defenses of the clan members.'
  },
  clan: {
    id: 'clan',
    label: 'Clan Overview',
    description: 'Clan summary and overview.'
  }
} as const;

export const RosterCommandSortOptions = [
  {
    name: 'Player Name',
    value: 'PLAYER_NAME'
  },
  {
    name: 'Discord Username',
    value: 'DISCORD_NAME'
  },
  {
    name: 'Town Hall Level',
    value: 'TOWN_HALL_LEVEL'
  },
  {
    name: 'Hero Levels',
    value: 'HERO_LEVEL'
  },
  {
    name: 'TH + Hero Levels',
    value: 'TH_HERO_LEVEL'
  },
  {
    name: 'Clan Name',
    value: 'CLAN_NAME'
  },
  {
    name: 'Signup Time',
    value: 'SIGNUP_TIME'
  },
  {
    name: 'Trophies',
    value: 'TROPHIES'
  }
] as const;

export const RosterManageActions = {
  ADD_USER: 'add-user',
  DEL_USER: 'del-user',
  CHANGE_ROSTER: 'change-roster',
  CHANGE_CATEGORY: 'change-category'
} as const;

export const WarCommandOptions = {
  ATTACKS: 'attacks',
  DEFENSES: 'defenses',
  LINEUP: 'lineup',
  REMAINING: 'remaining',
  OPEN_BASES: 'open-bases',
  OVERVIEW: 'overview'
} as const;

export type WarCommandOptionValues = (typeof WarCommandOptions)[keyof typeof WarCommandOptions];

export const ClanEmbedFields = {
  CLAN_LEADER: 'clanLeader',
  REQUIREMENTS: 'requirements',
  TROPHIES_REQUIRED: 'trophiesRequired',
  LOCATION: 'location',
  WAR_PERFORMANCE: 'warPerformance',
  WAR_FREQUENCY: 'warFrequency',
  CLAN_WAR_LEAGUE: 'clanWarLeague',
  CLAN_CAPITAL_LEAGUE: 'clanCapitalLeague',
  TOWN_HALLS: 'townHalls'
} as const;

export const ClanEmbedFieldOptions = [
  {
    value: ClanEmbedFields.CLAN_LEADER,
    label: 'Clan Leader'
  },
  {
    value: ClanEmbedFields.REQUIREMENTS,
    label: 'Requirements'
  },
  {
    value: ClanEmbedFields.TROPHIES_REQUIRED,
    label: 'Trophies Required'
  },
  {
    value: ClanEmbedFields.LOCATION,
    label: 'Location'
  },
  {
    value: ClanEmbedFields.WAR_PERFORMANCE,
    label: 'War Performance'
  },
  {
    value: ClanEmbedFields.WAR_FREQUENCY,
    label: 'War Frequency'
  },
  {
    value: ClanEmbedFields.CLAN_WAR_LEAGUE,
    label: 'Clan War League'
  },
  {
    value: ClanEmbedFields.CLAN_CAPITAL_LEAGUE,
    label: 'Clan Capital League'
  },
  {
    value: ClanEmbedFields.TOWN_HALLS,
    label: 'Town Halls'
  }
] as const;

export type ClanEmbedFieldValues = (typeof ClanEmbedFields)[keyof typeof ClanEmbedFields];
