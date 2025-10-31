import { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

import { ACTIVITY_COMMAND } from './commands/activity_command.js';
import { ALIAS_COMMAND } from './commands/alias_command.js';
import { ARMY_COMMAND } from './commands/army_command.js';
import { ATTACKS_COMMAND } from './commands/attacks_command.js';
import { AUTOROLE_COMMAND } from './commands/autorole_command.js';
import { BOOSTS_COMMAND } from './commands/boosts_command.js';
import { BOT_PERSONALIZER_COMMAND } from './commands/bot_personalizer_command.js';
import { CALLER_COMMAND } from './commands/caller_command.js';
import { CAPITAL_COMMAND } from './commands/capital_command.js';
import { CATEGORY_COMMAND } from './commands/category_command.js';
import { CLAN_COMMAND } from './commands/clan_command.js';
import { CLAN_GAMES_COMMAND } from './commands/clan_games_command.js';
import { CLANS_COMMAND } from './commands/clans_command.js';
import { COMPO_COMMAND } from './commands/compo_command.js';
import { CONFIG_COMMAND } from './commands/config_command.js';
import { CWL_COMMAND } from './commands/cwl_command.js';
import { DEBUG_COMMAND } from './commands/debug_command.js';
import { DONATIONS_COMMAND } from './commands/donations_command.js';
import { EVAL_COMMAND } from './commands/eval_command.js';
import { EVENTS_COMMAND } from './commands/events_command.js';
import { EXPORT_COMMAND } from './commands/export_command.js';
import { FLAG_COMMAND } from './commands/flag_command.js';
import { HELP_COMMAND } from './commands/help_command.js';
import { HISTORY_COMMAND } from './commands/history_command.js';
import { INVITE_COMMAND } from './commands/invite_command.js';
import { LASTSEEN_COMMAND } from './commands/lastseen_command.js';
import { LAYOUT_COMMAND } from './commands/layout_command.js';
import { LEADERBOARD_COMMAND } from './commands/leaderboard_command.js';
import { LEGEND_COMMAND } from './commands/legend_command.js';
import { LINEUP_COMMAND } from './commands/lineup_command.js';
import { LINK_COMMAND } from './commands/link_command.js';
import { MEMBERS_COMMAND } from './commands/members_command.js';
import { NICKNAME_COMMAND } from './commands/nickname_command.js';
import { PATREON_COMMAND } from './commands/patreon_command.js';
import { PLAYER_COMMAND } from './commands/player_command.js';
import { PROFILE_COMMAND } from './commands/profile_command.js';
import { REDEEM_COMMAND } from './commands/redeem_command.js';
import { REMAINING_COMMAND } from './commands/remaining_command.js';
import { REMINDERS_COMMAND } from './commands/reminders_command.js';
import { ROSTER_COMMAND } from './commands/roster_command.js';
import { RUSHED_COMMAND } from './commands/rushed_command.js';
import { SEARCH_COMMAND } from './commands/search_command.js';
import { SETUP_COMMAND } from './commands/setup_command.js';
import { STATS_COMMAND } from './commands/stats_command.js';
import { STATUS_COMMAND } from './commands/status_command.js';
import { SUMMARY_COMMAND } from './commands/summary_command.js';
import { TIMEZONE_COMMAND } from './commands/timezone_command.js';
import { TRANSLATE_COMMAND } from './commands/translate_command.js';
import { UNITS_COMMAND } from './commands/units_command.js';
import { UPGRADES_COMMAND } from './commands/upgrades_command.js';
import { USAGE_COMMAND } from './commands/usage_command.js';
import { VERIFY_COMMAND } from './commands/verify_command.js';
import { WAR_COMMAND } from './commands/war_command.js';
import { WARLOG_COMMAND } from './commands/warlog_command.js';
import { WHITELIST_COMMAND } from './commands/whitelist_command.js';
import { WHOIS_COMMAND } from './commands/whois_command.js';

export const COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [
  PLAYER_COMMAND,
  UNITS_COMMAND,
  UPGRADES_COMMAND,
  RUSHED_COMMAND,
  PROFILE_COMMAND,
  VERIFY_COMMAND,

  // ----------- CLAN BASED -----------
  CLAN_COMMAND,
  COMPO_COMMAND,
  BOOSTS_COMMAND,
  LASTSEEN_COMMAND,
  ACTIVITY_COMMAND,
  CLAN_GAMES_COMMAND,
  CAPITAL_COMMAND,
  ATTACKS_COMMAND,
  MEMBERS_COMMAND,
  STATS_COMMAND,
  DONATIONS_COMMAND,
  WAR_COMMAND,
  CALLER_COMMAND,
  REMAINING_COMMAND,
  LINEUP_COMMAND,
  WARLOG_COMMAND,
  HISTORY_COMMAND,
  CWL_COMMAND,

  // -------------- SETUP BASED--------------
  LINK_COMMAND,
  TIMEZONE_COMMAND,
  FLAG_COMMAND,
  SETUP_COMMAND,
  ALIAS_COMMAND,
  CATEGORY_COMMAND,
  ROSTER_COMMAND,
  AUTOROLE_COMMAND,
  REMINDERS_COMMAND,

  // -------- OTHER COMMANDS--------
  LEGEND_COMMAND,
  LEADERBOARD_COMMAND,
  SUMMARY_COMMAND,
  EXPORT_COMMAND,
  SEARCH_COMMAND,
  ARMY_COMMAND,
  NICKNAME_COMMAND,
  EVENTS_COMMAND,

  // ------------- UTIL COMMANDS -------------
  HELP_COMMAND,
  REDEEM_COMMAND,
  INVITE_COMMAND,
  DEBUG_COMMAND,
  CONFIG_COMMAND,
  WHITELIST_COMMAND,
  CLANS_COMMAND,
  LAYOUT_COMMAND,

  // -------- CONTEXT MENU COMMANDS--------

  WHOIS_COMMAND,
  TRANSLATE_COMMAND
];

export const MAIN_BOT_ONLY_COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [BOT_PERSONALIZER_COMMAND];

export const PRIVATE_COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [STATUS_COMMAND, PATREON_COMMAND, USAGE_COMMAND, EVAL_COMMAND];

export const HIDDEN_COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [];
