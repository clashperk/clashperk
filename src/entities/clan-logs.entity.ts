import { ObjectId } from 'mongodb';

export interface ClanLogsEntity {
  clanTag: string;
  guildId: string;
  logType: ClanLogType;
  clanId: ObjectId;
  isEnabled: boolean;
  channelId: string;
  deepLink: string;
  roleId?: string;
  webhook: { id: string; token: string } | null;
  messageId: string | null;
  color: number | null;
  metadata: Record<string, any>;
  lastPostedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

export const LogActions = {
  NAME_CHANGE: 'NAME_CHANGE',
  TOWN_HALL_UPGRADE: 'TOWN_HALL_UPGRADE',
  WAR_PREF_CHANGE: 'WAR_PREF_CHANGE',
  JOINED: 'JOINED',
  LEFT: 'LEFT',
  DEMOTED: 'DEMOTED',
  PROMOTED: 'PROMOTED',
  DONATED: 'DONATED',
  RECEIVED: 'RECEIVED',
  CAPITAL_GOLD_RAID: 'CAPITAL_GOLD_RAID',
  CAPITAL_GOLD_CONTRIBUTION: 'CAPITAL_GOLD_CONTRIBUTION',

  // Clan Types
  CLAN_LEVEL_UP: 'CLAN_LEVEL_UP',
  CAPITAL_HALL_LEVEL_UP: 'CAPITAL_HALL_LEVEL_UP',
  CAPITAL_LEAGUE_CHANGE: 'CAPITAL_LEAGUE_CHANGE',
  WAR_LEAGUE_CHANGE: 'WAR_LEAGUE_CHANGE'
} as const;

export type LogAction = (typeof LogActions)[keyof typeof LogActions];

export enum ClanLogType {
  // MEMBER
  CONTINUOUS_DONATION_LOG = 'continuous_donation_log',
  DAILY_DONATION_LOG = 'daily_donation_log',
  WEEKLY_DONATION_LOG = 'weekly_donation_log',
  MONTHLY_DONATION_LOG = 'monthly_donation_log',

  // MEMBER
  MEMBER_JOIN_LEAVE_LOG = 'member_join_leave_log',
  // MEMBER_JOIN_LOG = 'member_join_log',
  // MEMBER_LEAVE_LOG = 'member_leave_log',
  ROLE_CHANGE_LOG = 'role_change_log',
  TOWN_HALL_UPGRADE_LOG = 'town_hall_upgrade_log',
  NAME_CHANGE_LOG = 'name_change_log',

  // PLAYER
  WAR_PREFERENCE_LOG = 'war_preference_log',
  HERO_UPGRADE_LOG = 'hero_upgrade_log',

  // CLAN
  CLAN_ACHIEVEMENTS_LOG = 'clan_achievements_log',

  CLAN_CAPITAL_CONTRIBUTION_LOG = 'clan_capital_contribution_log',
  CLAN_CAPITAL_RAID_LOG = 'clan_capital_raid_log',
  // CLAN_CAPITAL_WEEKLY_IMAGE_LOG = 'clan_capital_weekly_image_log',
  CLAN_CAPITAL_WEEKLY_SUMMARY_LOG = 'clan_capital_weekly_summary_log',

  CLAN_GAMES_EMBED_LOG = 'clan_games_embed_log',
  CLAN_EMBED_LOG = 'clan_embed_log',
  LAST_SEEN_EMBED_LOG = 'last_seen_embed_log',
  // SUPER_TROOP_BOOSTS_EMBED_LOG = 'super_troop_boosts_embed_log',

  WAR_EMBED_LOG = 'war_embed_log',
  WAR_MISSED_ATTACKS_LOG = 'war_missed_attacks_log',

  CWL_EMBED_LOG = 'cwl_embed_log',
  CWL_LINEUP_CHANGE_LOG = 'cwl_lineup_change_log',
  CWL_MISSED_ATTACKS_LOG = 'cwl_missed_attacks_log',
  CWL_MONTHLY_SUMMARY_LOG = 'cwl_monthly_summary_log',

  // LEGEND
  LEGEND_ATTACKS_DAILY_SUMMARY_LOG = 'legend_attacks_daily_summary_log'
}
