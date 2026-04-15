# ClashPerk Developer Reference

> Internal reference for contributors and maintainers. For user documentation see [docs.clashperk.com](https://docs.clashperk.com).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Database Collections](#database-collections)
- [Command System](#command-system)
- [Log & Event System](#log--event-system)
- [Auto-Role System](#auto-role-system)
- [Inhibitors](#inhibitors)
- [Features Overview](#features-overview)

---

## Project Overview

ClashPerk is a Discord bot for Clash of Clans built with TypeScript, discord.js v14, and discord-hybrid-sharding. It provides clan management, player tracking, war logs, legend tracking, roster management, and automated role assignment.

**Workspaces:**
- `clashperk` — bot code (this repo)
- `clashperk-backend` — API server for the web dashboard
- `dashboard` — React web dashboard

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 20, TypeScript (ES2021, Node16 modules) |
| Discord | discord.js v14, discord-hybrid-sharding |
| Primary DB | MongoDB (replica set required) |
| Cache | Redis |
| Search | Elasticsearch |
| Analytics DB | ClickHouse |
| Error tracking | Sentry |
| Analytics | PostHog + Mixpanel |
| DI | tsyringe (reflect-metadata decorators) |
| i18n | i18next (32+ languages via `locales/` submodule) |
| AI | Vercel AI SDK + Cerebras |

---

## Getting Started

```bash
# Install dependencies
npm install

# Initialize locales submodule
npm run submodule

# Build (TypeScript compile + path alias resolution)
npm run build

# Run
npm run dev

# Deploy slash commands to Discord
npm run deploy

# Lint
npm run lint

# Detect unused code/dependencies
npm run knip
```

### Build System

- `tsc` compiles to `dist/`
- `tsc-alias` resolves path aliases (`@app/constants` → `src/util/constants.ts`, `@app/entities` → `src/entities/`)
- `postbuild` exports locales via `scripts/export_locale_script.js`

---

## Architecture

### Entry Points

**`src/index.ts`** — Cluster manager
- Uses `discord-hybrid-sharding` ClusterManager in multi-process mode
- `totalShards: 'auto'`, `shardsPerClusters: 2`
- Spawns HTTP health check server on `PORT` (default `8070`)
- `GET /` returns `{ isReady: boolean }`

**`src/main.ts`** — Individual shard bootstrap
- Loads `reflect-metadata` for tsyringe DI
- Initializes Sentry, i18next, then calls `client.init(DISCORD_TOKEN)`
- Handles `error`/`warn` and `unhandledRejection` via Sentry

### Startup Sequence (`client.init()`)

1. Register command/listener/inhibitor handlers (file-system scan)
2. Connect to MongoDB (main + global tracking DBs)
3. Initialize SettingsProvider, RedisService, storage handlers
4. Instantiate Enqueuer, StatsHandler, Resolver, war/capital/games schedulers, Subscribers
5. Auto-login to Clash of Clans API
6. On `clientReady`: initialize settings/subscribers, start job enqueuers (production only)

### Core Classes (`src/struct/`)

| File | Purpose |
|---|---|
| [client.ts](src/struct/client.ts) | Extended discord.js Client — holds all service references |
| [clash-client.ts](src/struct/clash-client.ts) | CoC API wrapper (clashofclans.js), retry/cache/error handling |
| [database.ts](src/struct/database.ts) | MongoDB connection manager (main + global DBs) |
| [settings-provider.ts](src/struct/settings-provider.ts) | Per-guild settings backed by MongoDB with change stream sync |
| [resolver.ts](src/struct/resolver.ts) | Resolves player/clan tags from user input, aliases, or linked accounts |
| [roster-manager.ts](src/struct/roster-manager.ts) | Roster CRUD and validation |
| [redis-service.ts](src/struct/redis-service.ts) | Redis caching layer |

**Client intents:** `Guilds`, `GuildMembers`, `GuildWebhooks`, `GuildMessages`

**Client cache:** Most caches disabled except messages/guild members/users (swept every 5 min)

### Directory Map

```
src/
├── index.ts              # Cluster manager (sharding)
├── main.ts               # Shard bootstrap
├── struct/               # Core service classes
├── commands/             # Slash commands organized by category
│   ├── activity/
│   ├── alias/
│   ├── autorole/
│   ├── config/
│   ├── cwl/
│   ├── export/
│   ├── flag/
│   ├── history/
│   ├── legend/
│   ├── link/
│   ├── reminders/
│   ├── rosters/
│   ├── search/
│   ├── setup/
│   ├── summary/
│   └── util/
├── core/                 # Log/event handler systems
├── entities/             # MongoDB collection type definitions (~39 collections)
├── helper/               # Feature-specific business logic
├── inhibitors/           # Pre-command validation
├── lib/                  # Handler framework (discovers/loads commands, listeners, inhibitors)
├── listeners/            # Discord event listeners
├── api/                  # Auto-generated CoC Swagger types
└── util/
    ├── constants.ts      # Feature flags, collection names, magic numbers
    ├── i18n.ts
    └── locales.ts
```

---

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot authentication token |
| `OWNER` | Owner Discord user ID |
| `MONGODB_URL` | Main MongoDB connection string |
| `GLOBAL_MONGODB_URL` | Global tracking MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `CLASH_OF_CLANS_API_KEYS` | Comma-separated CoC API keys |

### Optional / Service-specific

| Variable | Description |
|---|---|
| `PORT` | Health check HTTP port (default `8070`) |
| `NODE_ENV` | `development` or `production` |
| `SENTRY_DSN` | Sentry error tracking endpoint |
| `SERVICE_NAME` | Sentry service identifier |
| `ES_HOST` | Elasticsearch URL |
| `ES_PASSWORD` | Elasticsearch password |
| `ES_CA_CRT` | Elasticsearch TLS CA certificate |
| `CLICKHOUSE_HOST` | ClickHouse URL |
| `CLICKHOUSE_USER` | ClickHouse user (default: `default`) |
| `CLICKHOUSE_PASSWORD` | ClickHouse password |
| `CLASH_OF_CLANS_API_BASE_URL` | CoC API base (default: `https://api.clashofclans.com/v1`) |
| `MIXPANEL_TOKEN` | Mixpanel token |
| `POSTHOG_API_KEY` | PostHog API key |
| `POSTHOG_PERSONAL_API_KEY` | PostHog personal key |
| `PATREON_API_KEY` | Patreon integration key |
| `IMAGE_GEN_API_BASE_URL` | Image generation service URL |
| `INTERNAL_API_BASE_URL` | Internal microservice base URL |
| `INTERNAL_API_KEY` | Internal API auth key |
| `DOCKER_SERVICE_API_BASE_URL` | Docker service API URL |
| `DOCKER_SERVICE_API_KEY` | Docker service auth key |
| `DISCORD_LINK_USERNAME` | Discord link service credentials |
| `DISCORD_LINK_PASSWORD` | Discord link service credentials |
| `GOOGLE_API_KEY` | Google Sheets/Drive API key |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth2 refresh token |
| `JWT_DECODE_SECRET` | JWT signing/verification secret |
| `CEREBRAS_API_KEY` | Cerebras AI API key |
| `GIT_SHA` | Git commit SHA for versioning |

---

## Database Collections

Defined as enum `Collections` in [src/util/constants.ts](src/util/constants.ts).

### Player & Linking
| Collection | Purpose |
|---|---|
| `PlayerLinks` | User-to-player account associations |
| `Users` | User profile data |
| `Players` | Player stats cache |
| `Clans` | Clan data cache |

### Clan Tracking
| Collection | Purpose |
|---|---|
| `ClanLogs` | Detailed clan activity logs |
| `ClanStores` | Guild-specific clan aliases |
| `ClanWars` | War history and data |
| `ClanGames` | Clan games participation |
| `ClanGamesPoints` | Per-player clan games points |
| `CapitalContributions` | Capital gold contributions |
| `CapitalRaidSeasons` | Capital raid season data |
| `ClanRanks` | Ranked clan listings |
| `ClanCategories` | Guild clan categorization |
| `CWLGroups` | Clan War League group data |

### War & Legend
| Collection | Purpose |
|---|---|
| `LegendAttacks` | Legend league attack records |
| `WarBaseCalls` | War base attack designations |
| `FlagAlertLogs` | Flag system alert logs |

### Reminders & Schedulers
| Collection | Purpose |
|---|---|
| `Reminders` | War attack reminders |
| `RaidReminders` | Capital raid reminders |
| `ClanGamesReminders` | Clan games reminders |
| `Schedulers` | War schedulers |
| `RaidSchedulers` | Raid schedulers |
| `ClanGamesSchedulers` | Games schedulers |

### Rankings
| Collection | Purpose |
|---|---|
| `PlayerRanks` | Player rank tracking |
| `PlayerSeasons` | Season-based player stats |
| `CapitalRanks` | Capital contribution rankings |

### Rosters & Config
| Collection | Purpose |
|---|---|
| `Rosters` | Team roster definitions |
| `RosterCategories` | Roster categorization |
| `AutoRoleDelays` | Auto-role application delays |
| `Settings` | Guild-level settings |
| `FeatureFlags` | Feature flag toggles |
| `Layouts` | Base layout data |
| `GoogleSheets` | Linked Google Sheets |
| `GuildEvents` | Server event tracking |
| `CustomBots` | Custom bot instance data |

### Analytics
| Collection | Purpose |
|---|---|
| `BotGrowth` | Growth metrics |
| `BotUsage` | Command usage stats |
| `BotGuilds` | Guild subscription data |
| `BotUsers` | User activity data |
| `BotStats` | General bot statistics |
| `BotCommands` | Command execution logs |
| `BotInteractions` | Interaction analytics |
| `Patrons` | Patreon member tracking |

---

## Command System

### Base Class

All commands extend `Command` from [src/lib/handlers.ts](src/lib/handlers.ts):

```typescript
export class Command {
  id: string;
  aliases?: string[];
  category: string;
  defer: boolean;              // auto-defer the interaction
  ephemeral?: boolean;
  ownerOnly?: boolean;
  channel?: 'dm' | 'guild';
  userPermissions?: PermissionsString[];
  clientPermissions?: PermissionsString[];
  roleKey?: string | null;     // custom permission key

  args(interaction?): Args;
  autocomplete(interaction, args): Promise<unknown>;
  refine(interaction, args): CommandOptions;   // dynamic option override
  exec(interaction, args): Promise<unknown>;   // main handler
}
```

### Args Definition

```typescript
type Args = Record<string, {
  id?: string;
  match: 'SUB_COMMAND' | 'SUB_COMMAND_GROUP' | 'STRING' | 'INTEGER' |
         'BOOLEAN' | 'USER' | 'MEMBER' | 'CHANNEL' | 'ROLE' |
         'MENTIONABLE' | 'NUMBER' | 'COLOR' | 'ENUM';
  enums?: (string | string[])[];
  default?: unknown | ((value: unknown) => unknown);
} | null>
```

### Execution Flow

1. Handler receives `ChatInputCommandInteraction`
2. Matches command by name/alias
3. Runs inhibitors in priority order (blocks if any return `true`)
4. Parses args via `argumentRunner()` (resolves User/Role/Channel types)
5. Calls `command.refine()` for dynamic option overrides
6. Auto-defers if `defer: true`
7. Calls `command.exec(interaction, parsedArgs)`
8. Emits `COMMAND_STARTED` / `COMMAND_ENDED` events

### Typical `exec()` Pattern

```typescript
async exec(interaction, args) {
  // 1. Resolve player/clan
  const { player } = await this.client.resolver.resolvePlayer(interaction, args.tag);
  if (!player) return;

  // 2. Build embed
  const embed = new EmbedBuilder().setTitle(player.name)...;

  // 3. Add action rows
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...);

  // 4. Reply
  return interaction.editReply({ embeds: [embed], components: [row] });
}
```

### Adding a New Command

1. Create `src/commands/<category>/<name>.ts`
2. Extend `Command`, implement `exec()`
3. Export default instance
4. Add slash command definition to `scripts/update_commands_script.ts`
5. Run `npm run deploy` to register with Discord

---

## Log & Event System

All log handlers live in [src/core/](src/core/) and extend `RootLog` for webhook-based delivery.

### Log Handlers

| File | Event Types |
|---|---|
| [clan-log.ts](src/core/clan-log.ts) | JOIN, LEAVE, PROMOTE, DEMOTE, TH_UPGRADE, NAME_CHANGE, WAR_PREF, CAPITAL_CONTRIB, DONATION |
| [clan-war-log.ts](src/core/clan-war-log.ts) | War attacks, defenses, war results |
| [clan-games-log.ts](src/core/clan-games-log.ts) | Clan games participation & scores |
| [donation-log.ts](src/core/donation-log.ts) | Troop donations and requests |
| [capital-log.ts](src/core/capital-log.ts) | Capital raid attacks and results |
| [legend-log.ts](src/core/legend-log.ts) | Legend league attacks and pushes |
| [last-seen-log.ts](src/core/last-seen-log.ts) | Member activity / last seen |
| [flag-alert-log.ts](src/core/flag-alert-log.ts) | Flagged player alerts on clan join |
| [clan-embed-log.ts](src/core/clan-embed-log.ts) | Live clan embed panel updates |
| [ranked-battle-log.ts](src/core/ranked-battle-log.ts) | Multiplayer ranked battle activity |
| [auto-board-log.ts](src/core/auto-board-log.ts) | Auto-board roster updates |
| [roles-manager.ts](src/core/roles-manager.ts) | Automatic role assignment engine |

### Clan Log Colors

| Event | Color |
|---|---|
| `JOINED` | GREEN |
| `LEFT`, `DEMOTED`, `CAPITAL_GOLD_RAID` | RED |
| `PROMOTED`, `TOWN_HALL_UPGRADE` | CYAN |
| `NAME_CHANGE` | PEACH |
| `CAPITAL_GOLD_CONTRIBUTION` | DARK_GREEN |

### Delivery

- Messages sent via Discord webhooks with ~250ms delay between entries
- Bulk events use 2s delay to avoid rate limits
- Embeds include a "View Profile" button linking to the `/player` command
- Log channels are configured per-guild via `/setup-clan-logs`

---

## Auto-Role System

Managed by [src/core/roles-manager.ts](src/core/roles-manager.ts).

### Supported Role Types

| Type | Trigger |
|---|---|
| Clan roles | Leader / Co-Leader / Elder / Member position |
| Town Hall | TH level (1–17) |
| League | Trophy league tier |
| Builder League | Builder base league tier |
| Builder Hall | BH level |
| War roles | Active war participation |
| EOS push | End of season trophy push |
| Family roles | Member of linked family clan |
| Guest roles | Linked but not in family clan |

### Configuration Commands

- `/autorole-clan-roles` — Configure clan position roles
- `/autorole-town-hall` — Configure TH level roles
- `/autorole-leagues` — Configure league roles
- `/autorole-builder-hall` / `/autorole-builder-leagues`
- `/autorole-wars` — War participant roles
- `/autorole-eos-push` — EOS push roles
- `/autorole-family` — Family/guest roles
- `/autorole-config` — Global settings (delays, etc.)
- `/autorole-refresh` — Manual refresh trigger
- `/nickname-config` / `/nickname-refresh` — Nickname automation

---

## Inhibitors

Run before every command in priority order (highest priority first). First returning `true` blocks the command.

| File | Priority | Reason | What it checks |
|---|---|---|---|
| [blacklist.ts](src/inhibitors/blacklist.ts) | 1 | `blacklist` | Global user blacklist (`Settings.USER_BLACKLIST`). Owner bypasses. |
| [guild-ban.ts](src/inhibitors/guild-ban.ts) | 2 | `blacklist` | Global guild blacklist (`Settings.GUILD_BLACKLIST`). Owner bypasses. |
| [emoji.ts](src/inhibitors/emoji.ts) | 3 | `emoji` | ~~External emoji permission check~~ — intentionally disabled |
| [custom-bot-locker.ts](src/inhibitors/custom-bot-locker.ts) | 5 | `custom-bot` | Custom bot subscription check — disabled |
| [permission.ts](src/inhibitors/permission.ts) | 10 | `permission` | Bot channel permissions — disabled |

---

## Features Overview

### Player Commands
`/player` `/units` `/upgrades` `/rushed` `/army`

### Clan Commands
`/clan` `/compo` `/boosts` `/donations` `/search`

### War Commands
`/war` `/warlog` `/lineup` `/remaining` `/attacks` `/caller` `/stats`

### CWL Commands
`/cwl-roster` `/cwl-lineup` `/cwl-attacks` `/cwl-rounds` `/cwl-members` `/cwl-stars` `/cwl-stats`

### Legend League
`/legend-attacks` `/legend-days` `/legend-leaderboard` `/legend-stats`

### Activity
`/lastseen` `/clan-activity` `/clan-games` `/capital-contribution` `/capital-raids`

### History
`/history` — war attacks, CWL, legend, donations, clan games, capital, join/leave, loot, EOS trophies

### Summary (Multi-Clan)
`/summary-*` — wars, attacks, donations, trophies, leagues, CWL, war results, capital, clan games, activity, best members

### Leaderboards
`/leaderboard-clans` `/leaderboard-players` `/leaderboard-capital`

### Linking & Profiles
`/link-create` `/link-delete` `/link-list` `/profile` `/verify` `/timezone`

### Roster Management
`/roster-create` `/roster-clone` `/roster-edit` `/roster-delete` `/roster-post` `/roster-manage` `/roster-ping` `/roster-settings` `/roster-groups-*`

### Reminders
`/reminders-create` `/reminders-edit` `/reminders-delete` `/reminders-list` `/reminders-now`

### Flags
`/flag-create` `/flag-delete` `/flag-list`

### Exports (Excel)
`/export-wars` `/export-cwl` `/export-members` `/export-season` `/export-capital` `/export-rosters` `/export-users` and more

### Setup & Config
`/setup-clan` `/setup-clan-logs` `/setup-server-logs` `/setup-events` `/setup-buttons` `/setup-list` `/setup-enable` `/setup-disable` `/config` `/whitelist`

### Aliases & Categories
`/alias-create` `/alias-delete` `/alias-list` `/category-*`

### Utility
`/help` `/invite` `/status` `/events` `/patreon` `/redeem` `/ping` `/ask` `/translate`
