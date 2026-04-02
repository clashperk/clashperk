# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClashPerk is a Discord bot for Clash of Clans built with TypeScript, discord.js v14, and discord-hybrid-sharding. It provides clan management, player tracking, war logs, legend tracking, roster management, and automated role assignment across Discord servers.

## Common Commands

```bash
npm run build          # TypeScript compile + path alias resolution (tsc && tsc-alias)
npm run dev            # Run compiled output from dist/
npm run start          # Build + run
npm test               # ESLint check
npm run lint           # ESLint with --fix
npm run knip           # Detect unused code/dependencies
npm run deploy         # Update Discord slash commands (runs scripts/update_commands_script.ts)
npm run generate:api   # Regenerate Clash of Clans API types from Swagger
npm run submodule      # Initialize/update locales git submodule
```

## Architecture

### Entry Points
- `src/index.ts` — Cluster manager using discord-hybrid-sharding (process sharding, health check HTTP server on PORT env or 8070)
- `src/main.ts` — Discord client bootstrap: Sentry init, i18next setup, handler registration, login

### Core Classes (`src/struct/`)
- `client.ts` — Extended Discord.js client holding all service references (db, coc, redis, elastic, clickhouse, analytics, settings, handlers)
- `clash-client.ts` — Clash of Clans API integration via `clashofclans.js`
- `database.ts` — MongoDB connection managing two databases: main + global tracking
- `settings-provider.ts` — Per-guild settings backed by MongoDB
- `redis-service.ts` — Redis caching layer
- `roster-manager.ts` — Player roster CRUD and validation
- `resolver.ts` — Resolves player/clan tags from Discord users and arguments

### Command System (`src/commands/`)
Commands are organized by category (activity, alias, autorole, config, cwl, export, flag, history, legend, link, rosters, search, setup, summary, util). Each command extends a `Command` base class with `exec()` for slash command interactions. Inhibitors in `src/inhibitors/` run pre-command validation (permissions, blacklist, emoji checks).

### Event & Log System (`src/core/`)
Log handlers (clan-log, clan-war-log, capital-log, donation-log, etc.) process game events and post updates to configured Discord channels. The `Enqueuer` handles message batching and queuing.

### Handler Framework (`src/lib/`)
`handlers.ts` discovers and loads commands, listeners, and inhibitors from their directories using file-system scanning.

### Data Layer
- `src/entities/` — MongoDB collection type definitions (~39 collections)
- `src/helper/` — Feature-specific business logic helpers (legends, leaderboards, clan embeds, etc.)
- `src/util/constants.ts` — Feature flags, collection names, magic numbers
- `src/api/` — Auto-generated Swagger types for Clash of Clans API

### Localization
- `locales/` is a git submodule (`clashperk/locales`) with 32+ language translations
- i18next handles runtime translation with `src/util/i18n.ts` and `src/util/locales.ts`

## Key Technical Details

- **ES Modules** project (`"type": "module"` in package.json)
- **TypeScript path aliases**: `@app/constants` → `src/util/constants.ts`, `@app/entities` → `src/entities/`; resolved at build time by `tsc-alias`
- **Dependency injection** via `tsyringe` with decorators
- **Target**: ES2021, Module: Node16, strict mode
- **Formatting**: Prettier — single quotes, no trailing commas, 100 char width, 2-space indent, LF line endings
- **Node**: >= 20.x, Docker uses Node 22-alpine
- **Databases**: MongoDB (replica set required), Redis, Elasticsearch, Clickhouse
- **Monitoring**: Sentry for errors, PostHog + Mixpanel for analytics
