export interface ClanLogsEntity {
  clanTag: string;
  guildId: string;
  logType: ClanLogType;
  channelId: string;
  threadId: string | null;
  messageId: string | null;
  deepLink: string;
  webhook: { id: string; token: string } | null;
  color: number;
  updatedAt: Date;
  createdAt: Date;
}

export enum ClanLogType {
  FREQUENT_DONATION_LOG = 'frequent_log_continuous',
  DAILY_DONATION_LOG = 'daily_donation_log',
  WEEKLY_DONATION_LOG = 'weekly_donation_log',
  MONTHLY_DONATION_LOG = 'monthly_donation_log',

  CLAN_MEMBER_JOIN_LOG = 'clan_member_join_log',
  CLAN_MEMBER_LEAVE_LOG = 'clan_member_leave_log',
  CLAN_MEMBER_PROMOTION_LOG = 'clan_member_promotion_log',
  CLAN_MEMBER_DEMOTION_LOG = 'clan_member_demotion_log',
  HERO_UPGRADE_LOG = 'hero_upgrade_log',
  TOWN_HALL_UPGRADE_LOG = 'town_hall_upgrade_log',
  WAR_PREFERENCE_CHANGE_LOG = 'war_preference_change_log',
  CLAN_MEMBER_NAME_CHANGE = 'clan_member_name_change',
  CLAN_ACHIEVEMENTS_CHANGE_LOG = 'clan_achievements_change_log',

  CLAN_CAPITAL_DONATION_LOG = 'clan_capital_donation_log',
  CLAN_CAPITAL_ATTACKS_LOG = 'clan_capital_attacks_log',
  CLAN_CAPITAL_WEEKLY_IMAGE_LOG = 'clan_capital_weekly_image_log',
  CLAN_CAPITAL_WEEKLY_SUMMARY_LOG = 'clan_capital_weekly_summary_log',

  CLAN_GAMES_EMBED_LOG = 'clan_games_embed_log',
  CLAN_EMBED_LOG = 'clan_embed_log',
  LAST_SEEN_EMBED_LOG = 'last_seen_embed_log',
  SUPER_TROOP_BOOSTS_EMBED_LOG = 'super_troop_boosts_embed_log',

  CLAN_WAR_EMBED_LOG = 'clan_war_embed_log',
  CLAN_WAR_MISSED_ATTACKS_LOG = 'clan_war_missed_attacks_log',

  CWL_EMBED_LOG = 'cwl_embed_log',
  CWL_MISSED_ATTACKS_LOG = 'cwl_missed_attacks_log',
  CWL_MONTHLY_SUMMARY_LOG = 'cwl_monthly_summary_log',

  LEGEND_ATTACKS_DAILY_SUMMARY_LOG = 'legend_attacks_daily_summary_log'
}
