# Plan: split trophy seasons from calendar months

Status: draft, 2026-10-21. Covers the bot, `backend` (api + worker), `metrics-backend` (Go), `clashofclans.js`, `dashboard`, `docs.clashperk.com`, MongoDB, ClickHouse and Redis.

## The problem

- Since 2025-10-06 the game runs **trophy seasons of 28 days**, starting Mondays at 05:00 UTC.
- The API has no id for that 28-day season. A live check on 2026-10-21 found:
  - `currentLeagueSeasonId` / `previousLeagueSeasonId` are the start (unix seconds) of the player's **weekly league group**. Most players read Oct 19 / Oct 12, some Oct 5, and 0 when not in a group.
  - The gold pass runs on calendar months (1st 08:00 UTC).
- `clashofclans.js` `Util.getSeason()` still labels each season `YYYY-MM`, adding one month per season. 13 seasons a year means the label runs about one month ahead every year. The current season (Oct 5 – Nov 2) is `2026-11`, and the next one (Nov 2 – Nov 30) would be `2026-12`.
- Everything is keyed by that id: donations, attacks, loot, activity and ranks, not just legends. A "month" in our UI is therefore neither a calendar month nor an honest season label.

## Target model

| Kind | Id | Boundaries | Used for |
|---|---|---|---|
| **League season** | Start date `YYYY-MM-DD`, e.g. `2026-10-05` | 28 days, Monday 05:00 UTC | Trophies, legend attacks/days/leaderboards, battle logs, trophy rank snapshots, the league-reset event, EOS roles |
| **Month** | `YYYY-MM` | Calendar month, 1st 00:00 UTC | Donations, attacks/defense wins, loot and achievements, activity counts, war stats, capital contributions |
| **Clan games** (unchanged) | `YYYY-MM` / `YYYY-MM-00` | 22nd–28th window, "latest" until the 20th | Clan games |
| **CWL** (unchanged) | API value: `YYYY-MM` up to 2026-06, `YYYY-MM-DD` since 2026-06-17 | — | CWL groups |

Why a start date rather than the raw seconds:
- It's readable and sorts correctly as a string.
- It can never be confused with a `YYYY-MM` month, because the length differs.
- It already matches the CWL format.

The game's own `donations`, `donationsReceived` and `attackWins` counters reset at the **league** boundary. Monthly totals for those must be summed from the change between readings, never read straight off the counter. The Go `gained()` already treats a drop as a reset. Every other stat is achievement-based (`initial` / `current`), so it works per month as is.

### Legacy id → league season id (deterministic, 15 values)

| Legacy id | New id | Start (unix s) | Window (05:00 UTC) |
|---|---|---|---|
| `2025-09` | `2025-08-25` | 1756098000 | 2025-08-25 → 2025-10-06 (transition, 6 weeks) |
| `2025-10` | `2025-10-06` | 1759726800 | 2025-10-06 → 2025-11-03 |
| `2025-11` | `2025-11-03` | 1762146000 | 2025-11-03 → 2025-12-01 |
| `2025-12` | `2025-12-01` | 1764565200 | 2025-12-01 → 2025-12-29 |
| `2026-01` | `2025-12-29` | 1766984400 | 2025-12-29 → 2026-01-26 |
| `2026-02` | `2026-01-26` | 1769403600 | 2026-01-26 → 2026-02-23 |
| `2026-03` | `2026-02-23` | 1771822800 | 2026-02-23 → 2026-03-23 |
| `2026-04` | `2026-03-23` | 1774242000 | 2026-03-23 → 2026-04-20 |
| `2026-05` | `2026-04-20` | 1776661200 | 2026-04-20 → 2026-05-18 |
| `2026-06` | `2026-05-18` | 1779080400 | 2026-05-18 → 2026-06-15 |
| `2026-07` | `2026-06-15` | 1781499600 | 2026-06-15 → 2026-07-13 |
| `2026-08` | `2026-07-13` | 1783918800 | 2026-07-13 → 2026-08-10 |
| `2026-09` | `2026-08-10` | 1786338000 | 2026-08-10 → 2026-09-07 |
| `2026-10` | `2026-09-07` | 1788757200 | 2026-09-07 → 2026-10-05 |
| `2026-11` | `2026-10-05` | 1791176400 | 2026-10-05 → 2026-11-02 (current) |

- Ids before `2025-09` were made with the old last-Monday rule (id = month the season ends in). They're within a week of the calendar month and never collide, so they stay as legacy labels.
- **Exception:** the rank collections' `2025-10` snapshot was taken on 2025-09-29 under the old rule, so map by snapshot date, not this table.

## Phase 0: hotfixes with deadlines (do now, independent of the rest)

1. **Before 2026-10-22 05:00 UTC: clan-games cleanup cron.** Fix in [clashperk/service-backend#51](https://github.com/clashperk/service-backend/pull/51); it must be deployed before the deadline.
   - `backend/apps/api/src/tasks/services/clan-games-tasks.service.ts:10` renames `ClanGamesPoints` docs to `<id>-00` using `Util.getSeasonId()`, the 28-day id `2026-11`, but the docs are stored by calendar month `2026-10`. October has 32.6k `2026-10` docs and no `-00` docs, so tomorrow's games would carry pre-games baselines.
   - Fix: use the calendar month (`new Date().toISOString().slice(0, 7)`), or run the rename by hand at 05:00 tomorrow.
2. **Before 2026-11-02 05:00 UTC: `battle_logs.battle_season` default.** Done on 2026-10-21: the default was changed on production ClickHouse.
   - It derives the id from the season's end month, so it would write `2026-11` again for Nov 2 – Nov 30, merging two seasons, and the backend legend tasks would query an empty `2026-12`.
   - Stopgap: switch to the start-month formula. It is tested against all 196M existing rows with zero diffs, and `2026-11-02 05:00` correctly becomes `2026-12`. Phase 3 then moves it to start-date ids.
3. **Bot reads that are wrong today** (28-day id used against calendar data):
   - `search/clan.ts:366`: `ClanWars` by `Season.ID`.
   - `export-season.ts:206`, `summary-best.ts:205`: `ClanGamesPoints` by `Season.ID`.
   - "Since" options are one month in the future (`search/stats.ts:192`, `summary-missed-wars.ts:47`, `export-missed.ts:37`, `export-last-wars.ts:35`, `autocomplete-client.ts:100`).
   - `/clan-games` and `history-clan-games` choices come from the 28-day list.
4. **Backend:** `GET /clans/:tag/capital-contribution?season` validates `YYYY-MM-DD`, but the data is `YYYY-MM`, so the filter never matches.

## Phase 1: helpers (library first; everything else depends on it)

**clashofclans.js** (minor release; old functions are deprecated, not removed):
Status: done in [clashperk/clashofclans.js#256](https://github.com/clashperk/clashofclans.js/pull/256) (5.1.0).

- `Util.getLeagueSeason(date?)` returns `{ id: 'YYYY-MM-DD', startTime, endTime }`. It keeps the current 28-day math plus the 2025-08-25 transition and the last-Monday rule before that.
- `Util.getLeagueSeasonById(id)` accepts a start date or a legacy `YYYY-MM` (via the table above).
- `Util.getLeagueSeasons(count)`, newest first.
- `Util.getMonth(date?)` returns `{ id: 'YYYY-MM', startTime, endTime }` in UTC. Also add `Util.getMonths(count)`.
- Deprecate `getSeason`, `getSeasonId`, `getSeasonById`, `getSeasonStart`, `getSeasonEnd`.
- Fix the `Season.ts:16` fallback to `getSeasonId()`.
- Type `Client.getLeagueGroup` `seasonId` as `string | number`.
- Make one live call to confirm what `legendStatistics.*Season.id` and `/leagues/105000036/seasons` return now, and type them accordingly.
- Tests: golden values for 2025-08-25 through 2027-12, including the 2026-11-02 / 2026-11-30 pair.

**metrics-backend (Go)** `internal/util/season.go`:
- Mirror the library with `LeagueSeasonAt(t) (start, end, id)` and `MonthID(t)`.
- Delete the dead `GetSeasonStart`, `GetSeasonEnd`, `GetLastSeasonID` and `coc.GetPlayerSeasonRanking`.
- Collapse the two `monthOf` copies into `util.MonthID`.
- Update `season_test.go` golden values, which are cross-checked against the library.

**backend** worker: done in [clashperk/service-backend#52](https://github.com/clashperk/service-backend/pull/52).
- `Season.leagueId` / `Season.statsId` replace `Season.ID`.
- Everything is behind `SEASON_SPLIT=1`, so the PR can be deployed before the window and switched on during it.
- `PlayerLeagueSeasons` needs a unique `{tag, seasonId}` index created in the migration.

**bot** `src/util/toolkit.ts`:
- Same split, with `Season.monthId` in UTC (it currently uses server-local `moment()`).
- Replace `getSeasonIds()` with `getLeagueSeasonChoices()` (label like "5 Oct – 2 Nov 2026") and `getMonthChoices()` (label "Oct 2026").

## Phase 2: what each store becomes

| Store | Today | Becomes | Migration |
|---|---|---|---|
| Mongo `LegendAttacks.seasonId` (1.29M) | 28-day `YYYY-MM` | league start date | relabel (15 indexed `updateMany` calls) |
| Mongo `PlayerSeasons.season` (37.5M) | 28-day, mixed trophy + monthly stats | **month**, monthly stats only | relabel 28-day-era docs to start dates; move trophies out (next row) |
| Mongo **new** `PlayerLeagueSeasons` | — | `{tag, seasonId, trophies, versusTrophies, leagueId}` | backfill with `$merge` from `PlayerSeasons` trophy fields |
| Mongo `Players.seasons.<id>` (3.2M) | 28-day activity counts | month keys | `$rename` the 28-day-era keys to start dates |
| Mongo `PlayerRanks` | 28-day | league start date | relabel by snapshot date |
| Mongo `ClanRanks` | 28-day | league start date | relabel by snapshot date |
| Mongo `CapitalRanks` | 28-day | raid `weekId` going forward (D2) | relabel history to league start dates; new weekly snapshot job in the worker |
| Mongo `ClanWars.season` | calendar since 2025-11 | month | none (optional: re-derive pre-2025-11 from `preparationStartTime`) |
| Mongo `ClanGames`, `ClanGamesPoints`, `CapitalContributions` | calendar | unchanged | none (after the Phase 0 fix) |
| Mongo `CWLGroups.season` | API value | unchanged | none; readers must handle `YYYY-MM-DD` |
| CH `battle_logs.battle_season` (201M) | end-month `YYYY-MM` | league start date | `MODIFY COLUMN` default plus `ALTER UPDATE` with `transform()`; the column isn't in the key, so a mutation is allowed |
| CH `legend_players.seasonId` (6.6M) | 28-day | league start date | **rebuild**: the id is in `ORDER BY`. New table partitioned by season, `INSERT SELECT` with `transform()`, `EXCHANGE TABLES`. Fix dedupe and drop the 4,419 rows dated 2070 at the same time |
| CH `legend_players_projected` + MV | copies `seasonId` | league start date | rebuild, then recreate the MV |
| CH `legend_players_ranked(_projected)` | `PARTITION BY battle_season` | league start date | rebuild with `INSERT SELECT transform()`; the backend's `REPLACE PARTITION` then uses the new id |
| CH `battle_logs_temp_2026_06` | leftover | — | drop |
| Redis `RECOVERY:{seasonId}:{tag}` | 28-day, TTL hours | month | none (expires) |
| Other Redis keys | no season id | — | none |

Why relabel history instead of only changing new writes:
- The current id `2026-11` (Oct 5 – Nov 2) would collide with calendar November in `PlayerSeasons` and `Players.seasons`.
- The older 28-day labels claim the wrong month in every history view.

The bare minimum to avoid a collision is relabeling `2026-11` before the cutover. The full relabel is what makes history honest.

Existing data problems to clean up or mark during the migration:
- `PlayerSeasons` written under the wrong id on 2026-06-27 → 07-07 (wrote `2026-06`) and 2026-08-01/02 (wrote `2026-07`, about 91k docs).
- The `legend_players` 2025-10 / 2025-11 overlap (2025-10-27 → 11-03), and the gap from 2026-08-15 to 09-24.
- CWL wars from 2026-06-18 to 06-24 split across two months in `ClanWars`.

## Phase 3: cutover

**Cutover instant: 2026-11-01 00:00 UTC** (the first calendar month). This is before the 2026-11-02 05:00 league reset, so no 28-day `2026-12` id is ever written.

1. **By Oct 28:** release the library; merge the writer changes behind a cutover timestamp (`MONTHS_FROM=2026-11-01T00:00Z`). Before it, writers keep today's ids; after it, monthly stores use `YYYY-MM` and league stores use start dates.
2. **Oct 31, maintenance window (~1h):**
   - Pause writers: the Go trackers and the backend worker.
   - Run the relabel scripts (Mongo, then the ClickHouse rebuilds and `EXCHANGE`).
   - Backfill `PlayerLeagueSeasons`.
   - Deploy the writers and the API.
   - Resume writers.
   - Every script is idempotent and driven by the mapping table, and each is dry-run first against counts.
3. **Bot deploy:** two option lists; league commands use league ids, monthly commands use months. Re-run `npm run deploy` for the slash choices.
4. **Dashboard:**
   - "This month / Last month" copy for `/players/:tag/seasons`.
   - The `/events` page says the trophy season lasts 28 days.
5. **Docs:**
   - Regenerate the command pages.
   - Fix `features/logs.md`, which says the monthly donation log posts on the last Monday.
   - Note the 28-day reset in `features/discord-events.md`.

Fallback if Oct 31 is too tight: ship only Phase 0 and cut over at **2026-12-01 00:00 UTC**. Then `2026-11` and `2026-12` (28-day) both need relabeling.

## API contract changes (backend → dashboard / bot)

| Endpoint | Change |
|---|---|
| `GET /players/:tag/seasons` | `season` becomes a calendar month after the cutover; older items carry start-date ids. Add a `kind: 'month' \| 'league'` field |
| `GET /players/:tag/battle-log`, `POST /players/battle-log/leaderboard` | `seasonId` becomes a start date; also accept a legacy `YYYY-MM` for one release (mapped) |
| `/legends/*` | `seasonId` becomes a start date |
| `GET /legends/:tag/estimate-rank` | actually filter by `seasonId` (currently ignored) |
| `GET /clans/:tag/capital-contribution` | accept `YYYY-MM` |
| `apps/api/src/tasks/tasks.service.ts` | delete the one-off endpoints with hard-coded `2025-09` / `2025-10` / `2025-11` |

## Decisions (2026-10-21)

- **D1:** league season id is the start date (`2026-10-05`).
- **D2 (proposed, needs confirmation):** each rank collection follows the cycle its points move on.
  - `PlayerRanks` uses the league season.
  - `ClanRanks` uses the league season too: clan points are the sum of member trophies, which reset with the league.
  - `CapitalRanks` moves to **raid weeks**. Capital points only change on raid weekends (Fri 07:00 → Mon 07:00 UTC), so take the snapshot after each raid weekend ends. Key it by the raid `weekId` (`YYYY-MM-DD`, the same id as `CapitalRaidSeasons.weekId`) and offer week choices in `/leaderboard capital`. The existing rows keep their league-season labels as history.
- **D3:** months start on the 1st at 00:00 UTC.
- **D4:** writers in production.
  - `backend/apps/worker` writes everything monthly: `PlayerSeasons`, `Players.seasons`, ranks, clan games, wars and capital.
  - In `metrics-backend`, only legend (`LegendAttacks`, `legend_players`), battle logs and global tracking are live.
  - The monthly and rank changes therefore go into the backend worker. Go needs only the league-id change, plus the util and tests, so its inactive player, war, capital and ranking services don't come back on the old ids.
- **D5:** `versusTrophies` resets with the league season, so it moves into `PlayerLeagueSeasons`.
- **D6:** relabel all 28-day-era history, carefully (see "Rename safety" below).

## Rename safety

- **Back up first.** Copy every affected collection to `<name>_bak_20261031` (e.g. `PlayerSeasons` with a `$match` on the 15 legacy ids, then `$out`), or keep a mongodump. In ClickHouse the rebuild keeps the old table under `<name>_old` after `EXCHANGE TABLES`. Delete the backups only after a week of clean reads.
- **One mapping, stored.** Write the 15-row table to a `SeasonIdMap` collection and a ClickHouse dictionary or `transform()` arrays. Every script reads from there, never from hand-typed literals.
- **Dry run.**
  - For each store, count the docs per legacy id before the rename.
  - Count the docs per new id that already exist; this must be 0, otherwise there is a collision.
  - Check that each legacy id maps to exactly one new id.
- **Idempotent, batched.**
  - Filter on the legacy id and set the new id, so re-running is a no-op.
  - `PlayerSeasons` runs per id on the `{season}` index, in batches of about 50k `_id`s. `Players.seasons` uses `$rename` per key.
  - Watch the unique indexes `{tag, season}` and `{tag, seasonId}`: a duplicate-key error means stop, never retry with upsert.
- **Verify.** Counts per new id must equal the pre-run counts per legacy id. Spot-check 20 tags per store against the backup.
- **Writers paused.** Trackers stay off from the start of the rename to the deploy of the new writers, so nothing writes a legacy id mid-run.
- **Rollback.** Restore from the backup collections or tables (the reverse mapping is the same table).
