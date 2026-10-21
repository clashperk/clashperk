# Season split plan

## Problem

- Since 2025-10-06 trophy league seasons last 28 days and start on Mondays at 05:00 UTC.
- Our `YYYY-MM` season label advances one month per season. With 13 seasons a year it drifts about one month ahead every year: Oct 5 – Nov 2, 2026 is labelled `2026-11`.
- The API's `currentLeagueSeasonId` is the start of the player's weekly league group, not this season. The API has no id for the 28-day season.

## Ids

| Kind | Id | Stores |
|---|---|---|
| League season | start date `YYYY-MM-DD` (`2026-10-05`) | `PlayerSeasons`, `LegendAttacks`, `PlayerRanks`, `ClanRanks`, `CapitalRanks`; ClickHouse `battle_logs.battle_season` and the legend tables |
| Calendar month (unchanged) | `YYYY-MM` | `Players.seasons` (activity), `ClanWars`, `ClanGames` / `ClanGamesPoints`, `CapitalContributions` |
| CWL | API value | `CWLGroups` |

- There is no calendar-month cutover and no `PlayerLeagueSeasons` collection.
- `SEASON_SPLIT=1` switches on start-date ids. Set it on the worker, the API, the Go legend tracker, the bot and the custom bots.
- With the flag off, every service keeps the legacy ids.

## Migration

- **What gets renamed:** 28-day ids, renamed to start dates.
  - `PlayerSeasons` and `LegendAttacks` from `2025-09`.
  - The rank collections from `2025-11`.
  - Every ClickHouse season column.
- **What stays as it is:** old last-Monday ids and `Players.seasons`.
- **Order:**
  1. Pause the writers.
  2. Rename `--ids=2026-11,2026-10`.
  3. `verify`.
  4. Turn the flag on everywhere, then run the bot's `npm run deploy`.
  5. Resume the writers.
  6. Rename the remaining ids online, newest first.
- **Rollback** reverses the mapping stored in `SeasonIdMap`.
- **Steps:** see `docs/season-split-runbook.md` in the backend repo.

## Done

- clashofclans.js 5.1.0: `getLeagueSeason`, `getLeagueSeasonById`, `getMonth`.
- The `battle_logs.battle_season` default stopgap, applied on 2026-10-21.
- The clan games cleanup cron fix (clashperk/service-backend#51).

## Open

- docs.clashperk.com: regenerate the command pages, and fix the donation log's "last Monday" wording.
- Dashboard: season wording.
- Known data problems, carried over unchanged by the migration:
  - The `legend_players` 2025-10 / 2025-11 overlap.
  - `PlayerSeasons` rows from summer 2026 written under the previous season's id.
