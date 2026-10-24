# Roadmap: league data from the asset library

The bot hard-codes league rules in `src/util/constants.ts`, and they drift every time Supercell
changes them (CWL promotions in #428, ranked promotion rates in #448). Unit and building data
already come from the asset library through `clashofclans.js` (`npm run update:static`).
League data should come from the same source.

Source: `https://assets.clashperk.com/raw.min.json`, which is generated from the game files by
`clash-asset-library`.

## Goal

The league tables in the bot are derived from game data, and none are hand-maintained. A game
update then only needs a static-data refresh in `clashofclans.js` and a dependency bump in the
bot.

## What moves

| Bot constant | Source in `raw.min.json` | Notes |
| --- | --- | --- |
| `WAR_LEAGUE_PROMOTION_MAP` | `war_leagues[].num_promotions`, `num_demotions` | `demotion = 9 - num_demotions` (9 when 0); keep Unranked 48000000 as a fallback |
| `WAR_LEAGUE_MAP` | `war_leagues[].name` | |
| `MEDALS_RANKING_MAP` | `war_leagues[].cwl_medals` | rank `r` gets `league_win_reward - (r - 1) * league_pos_reward_effect` |
| `LeaguePromotionsMap` | `league_tiers[].promote_percentage`, `demote_percentage` | 105000036 is `null`, meaning no zones |
| `BattlesPerWeek` | `league_tiers[].battle_count` | |
| `PLAYER_LEAGUE_MAP` | `league_tiers[].name` | |
| `CAPITAL_LEAGUE_MAP` | `capital_leagues[].name` | |
| `BUILDER_BASE_LEAGUES` / `_MAP` | `builder_leagues[].name` | |

These stay in the bot because they aren't game data: emoji maps (`PLAYER_LEAGUE_MAPS`,
`BUILDER_BASE_LEAGUE_MAPS`), role thresholds, and colors.

Still to verify against the game data before moving:

- `GUARANTEED_BONUS`: no matching field found yet. `cwl_medals.min_num_medal_bonuses` and
  `bonus_medal_reward` look related but don't map one-to-one.
- `MEDALS_PERCENTAGE_MAP`: may be bot logic rather than game data.
- `MAX_TOWN_HALL_LEVEL`, `MAX_BUILDER_HALL_LEVEL`, `LEGEND_LEAGUE_ID`: could come from
  `buildings` and `league_tiers`, but they're used widely, so check them last.

## Phases

1. **`clashofclans.js`: bundle and expose league data.** Extend `update:static` to copy
   `war_leagues`, `league_tiers`, `capital_leagues` and `builder_leagues`, and export typed
   lookups from `StaticData` (for example `getWarLeague(id)` and `getLeagueTier(id)`).
   Normalize to bot-friendly shapes there, such as the demotion rank and the medal arrays, so
   consumers never repeat the conversion. Publish, then bump the dependency in the bot.
2. **Bot: switch call sites.** Rebuild each constant in the table from the lookups, keeping the
   same names and shapes so call sites (`cwl.helper.ts`, `cwl-stats.ts`,
   `summary-cwl-ranks.ts`, `legends.helper.ts`) don't change. One PR per league family: CWL,
   ranked, capital, builder.
3. **Bot: delete the literals.** Once the derived values match, remove the hard-coded tables.
   Keep the Unranked war league (48000000) as an explicit fallback, since it isn't in the game
   data.
4. **Keep it fresh.** Refresh static data in `clashofclans.js` on every game update; the bot only
   needs the dependency bump. The data is bundled at build time and never fetched at runtime, so
   the bot doesn't depend on the CDN being up.

## Decisions

- Bundle the data in `clashofclans.js` instead of fetching `raw.min.json` at runtime. That keeps
  the data versioned with the library, removes a runtime network dependency, and follows the
  pattern units and buildings already use.
- Data fixes belong in `clash-asset-library` (`main.py`), never in the bot or in the bundled
  copy.
