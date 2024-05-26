export interface ClanLogsEntity {
  clanTag: string;
  guildId: string;
  logType: LogTypes;
  channelId: string;
  threadId: string | null;
  webhook: { id: string; token: string } | null;
  embedColor: number | null;
}

export enum LogTypes {
  DONATION_LOG_CONTINUOUS = 'donation_log_continuous',
  DONATION_LOG_DAILY = 'donation_log_daily',
  DONATION_LOG_WEEKLY = 'donation_log_weekly',
  DONATION_LOG_MONTHLY = 'donation_log_monthly',

  CLAN_FEED_MEMBER_JOIN_LOG = 'clan_feed_member_join_log',
  CLAN_FEED_MEMBER_LEAVE_LOG = 'clan_feed_member_leave_log',
  CLAN_FEED_ROLE_CHANGE_LOG = 'clan_feed_role_change_log',
  CLAN_FEED_HERO_UPGRADE_LOG = 'clan_feed_hero_upgrade_log',
  CLAN_FEED_TOWN_HALL_UPGRADE_LOG = 'clan_feed_town_hall_upgrade_log',
  CLAN_FEED_WAR_PREFERENCE_CHANGE_LOG = 'clan_feed_war_preference_change_log',
  CLAN_FEED_CLAN_ACHIEVEMENTS_CHANGE_LOG = 'clan_feed_clan_achievements_change_log',

  CLAN_CAPITAL_DONATION_LOG = 'clan_capital_donation_log',
  CLAN_CAPITAL_ATTACKS_LOG = 'clan_capital_attacks_log',
  CLAN_CAPITAL_WEEKLY_IMAGE_LOG = 'clan_capital_weekly_image_log',
  CLAN_CAPITAL_WEEKLY_SUMMARY_LOG = 'clan_capital_weekly_summary_log',

  CLAN_GAMES_EMBED_LOG = 'clan_games_embed_log',
  CLAN_EMBED_LOG = 'clan_embed_log',
  PLAYERS_EMBED_LOG = 'PLAYERS_embed_log',
  SUPER_TROOP_BOOSTS_LOG = 'super_troop_boosts_log',

  CLAN_WAR_EMBED_LOG = 'clan_war_embed_log',
  CLAN_WAR_MISSED_ATTACKS_LOG = 'clan_war_missed_attacks_log',

  CWL_EMBED_LOG = 'cwl_embed_log',
  CWL_MISSED_ATTACKS_LOG = 'cwl_missed_attacks_log',
  CWL_MONTHLY_SUMMARY_LOG = 'cwl_monthly_summary_log',

  LEGEND_ATTACKS_DAILY_SUMMARY_LOG = 'legend_attacks_daily_summary_log'
}
