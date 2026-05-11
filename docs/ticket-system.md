# Ticket System

> Developer reference for the ticket system. Covers architecture, data model, configuration flows, and the ticket lifecycle.

---

## Table of Contents

- [Overview](#overview)
- [Files](#files)
- [Data Model](#data-model)
- [Setup Flow (`/ticket-setup`)](#setup-flow-ticket-setup)
- [Posting a Panel (`/ticket-post`)](#posting-a-panel-ticket-post)
- [Opening a Ticket (`ticket-open`)](#opening-a-ticket-ticket-open)
- [Ticket Lifecycle Commands](#ticket-lifecycle-commands)
- [In-Ticket Actions](#in-ticket-actions)
- [Channel Naming Conventions](#channel-naming-conventions)
- [Logging](#logging)
- [Discord CV2 Constraint](#discord-cv2-constraint)

---

## Overview

The ticket system allows server admins to create **panels** — Discord messages with a "Create Ticket" button. When clicked, the bot opens a private channel (ticket) for the user. Each panel has one or more **application types** that determine what questions are asked, what accounts are required, which staff roles are notified, and which category the channel is placed in.

---

## Files

| File | Purpose |
|---|---|
| [src/commands/tickets/ticket-setup.ts](src/commands/tickets/ticket-setup.ts) | Panel configuration dashboard |
| [src/commands/tickets/ticket-post.ts](src/commands/tickets/ticket-post.ts) | Posts the panel embed + button to a channel |
| [src/commands/tickets/ticket-open.ts](src/commands/tickets/ticket-open.ts) | Handles button click → ticket creation flow |
| [src/commands/tickets/ticket-close.ts](src/commands/tickets/ticket-close.ts) | Closes a ticket (moves to closed category) |
| [src/commands/tickets/ticket-delete.ts](src/commands/tickets/ticket-delete.ts) | Deletes a ticket channel |
| [src/commands/tickets/ticket-reopen.ts](src/commands/tickets/ticket-reopen.ts) | Reopens a closed/sleeping ticket |
| [src/commands/tickets/ticket-sleep.ts](src/commands/tickets/ticket-sleep.ts) | Puts a ticket to sleep |
| [src/commands/tickets/ticket-info.ts](src/commands/tickets/ticket-info.ts) | Shows ticket metadata |
| [src/commands/tickets/ticket-add.ts](src/commands/tickets/ticket-add.ts) | Adds a user to a ticket channel |
| [src/entities/tickets.entity.ts](src/entities/tickets.entity.ts) | TypeScript interfaces for DB collections |

---

## Data Model

### `TicketPanelEntity` (collection: `TicketPanels`)

Stored once per panel per guild.

```ts
interface TicketPanelEntity {
  _id: ObjectId;
  guildId: string;
  name: string;                  // panel name, unique per guild

  displayMode?: 'menu' | 'buttons'; // default 'menu'
                                 // 'menu'    → single "Create Ticket" button opens a select menu
                                 // 'buttons' → one button per type (max 5; falls back to menu if >5)

  embed: {
    title?: string;
    description?: string;
    color?: number;              // hex integer
    imageUrl?: string;
    thumbnailUrl?: string;
    footerText?: string;
  };

  button: {                      // used only in 'menu' display mode
    label: string;               // default: "Create Ticket"
    emoji?: string;              // default: "📩"; validated with parseEmoji on save — invalid input discarded
    style: number;               // ButtonStyle enum value, default: Primary
  };

  ticketTypes: TicketTypeConfig[];

  logChannels: {
    buttonClick?: string;        // channel ID for button click logs
    statusChange?: string;       // channel ID for status change logs
    ticketClose?: string;        // channel ID for ticket close logs
  };

  // Extra buttons appended to panel post action rows alongside Create Ticket buttons
  extraButtons?: {
    id: string;                  // nanoid(8), stable key for UI state
    label: string;
    emoji?: string;              // validated with parseEmoji on save
    cmd?: string;                // command name for routing button (e.g. 'link-add')
    args?: Record<string, string>; // baked into custom ID at render time
    style?: number;              // ButtonStyle for command buttons (default: Secondary)
    url?: string;                // URL for ButtonStyle.Link buttons
  }[];                           // max 10; cmd or url is set, not both
  extraButtonsPlacement?: 'same-row' | 'new-row'; // default: 'same-row'
                                 // 'same-row' → extra buttons fill the Create Ticket row, overflow to next
                                 // 'new-row'  → extra buttons always start on a fresh action row

  createdAt: Date;
  updatedAt: Date;
}
```

### `TicketTypeConfig`

Embedded array in `TicketPanelEntity`. Each entry is one application type option.

```ts
interface TicketTypeConfig {
  id: string;                    // nanoid(8), used as buttonId in tickets
  label: string;
  emoji?: string;
  buttonStyle?: number;          // ButtonStyle for this type's button in 'buttons' display mode
  // Gate checks — evaluated before creating the channel
  requireLinkedAccount: boolean;
  thMin?: number;                // minimum Town Hall level (only checked when requireLinkedAccount=true)
  minTrophies?: number;          // minimum trophy count (only checked when requireLinkedAccount=true)
  minLeagueTier?: string;        // minimum league tier ID from PLAYER_LEAGUE_MAP (requireLinkedAccount=true)
  heroRequirements?: { name: string; level: number }[];

  // Application questions shown in a modal before ticket creation
  questions?: { label: string; placeholder?: string; required: boolean }[];

  // Staff role permissions
  pingRoleIds: string[];         // full access + ManageMessages/ManageChannels
  viewOnlyRoleIds: string[];     // ViewChannel + SendMessages, no manage (displayed as "Viewer")

  // Role changes applied to ticket creator on open
  addRoleIds: string[];
  removeRoleIds: string[];

  // Channel placement
  openCategoryId?: string;
  sleepCategoryId?: string;
  closedCategoryId?: string;

  namingConvention: string;      // see Channel Naming Conventions
  createStaffThread: boolean;    // create a private thread for staff on ticket open
  autoSleepHours?: number;       // auto-sleep ticket after N hours of creator inactivity
  allowClaim?: boolean;          // if true, staff can claim exclusive ownership of this ticket type
}
```

### `TicketGuildSettingsEntity` (collection: `TicketSettings`)

One document per guild. Stores server-wide saved replies (shared across all panels and types).

```ts
interface TicketGuildSettingsEntity {
  _id: ObjectId;
  guildId: string;
  savedReplies: { name: string; content: string }[];  // max 25 per server
  updatedAt: Date;
}
```

### `TicketEntity` (collection: `Tickets`)

One document per open/closed ticket.

```ts
interface TicketEntity {
  _id: ObjectId;
  count: number;                 // sequential ticket number per guild
  guildId: string;
  channelId: string;
  threadId?: string;             // staff private thread, if createStaffThread=true
  panelId: string;               // TicketPanelEntity._id as hex string
  buttonId: string;              // TicketTypeConfig.id
  creatorId: string;
  accountTag?: string;           // CoC player tag if linked account was used
  accountName?: string;
  accountTh?: number;
  answers?: { question: string; answer: string }[];
  clanTag?: string;
  clanName?: string;
  status: 'open' | 'sleep' | 'closed';
  notifyMeUserIds: string[];
  transcriptUrl?: string;
  autoSleepAt?: Date;            // set on creation if autoSleepHours configured
  claimedBy?: string;            // Discord user ID of the admin who claimed the ticket
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  closedBy?: string;
}
```

---

## Setup Flow (`/ticket-setup`)

**Command:** `/ticket-setup panel_name:<name>`

Creates the panel if it does not exist (with a default "General" application type), then opens an interactive dashboard in the channel.

### Default panel on creation

```ts
{
  embed: { title: 'Open a Ticket', description: 'Click a button below to open a support ticket.', color: 0x5865f2 },
  button: { label: 'Create Ticket', emoji: '📩', style: ButtonStyle.Primary },
  ticketTypes: [
    {
      id: nanoid(8),
      label: 'General',
      requireLinkedAccount: false,
      pingRoleIds: [], viewOnlyRoleIds: [], addRoleIds: [], removeRoleIds: [],
      namingConvention: 'ticket-{count}',
      createStaffThread: false
    }
  ],
  logChannels: {}
}
```

### Dashboard sections

The dashboard is a CV2 container laid out as numbered steps, each with an **Edit** button:

| Step | Section | What it configures |
|---|---|---|
| **Step 1** | **Embed** | Panel embed: title, description, hex color |
| **Step 2** | **Create Ticket Button** | Display mode (Menu or Buttons) + panel button label/emoji/style (menu mode only) |
| **Step 3** | **Application Types** | Add/edit/delete/reorder types; summary of each (roles, questions, requirements) |
| **Step 4** | **Saved Replies** | Server-wide staff reply templates (shared across all panels and types) |
| **Step 5** | **Logging** | Log channels for button click, status change, ticket close events |
| **Step 6** | **Extra Buttons** | Additional buttons appended to the panel post alongside Create Ticket buttons |

Per-type settings (staff roles, apply rules, questions, categories, naming, button style) are configured inside the **Application Types** sub-flow, not in the main dashboard.

### Application type sub-flow

Opened via **Edit / Delete** next to a type. Sections:

| Section | What it configures |
|---|---|
| **Label / Emoji / Button Style** | Type label, emoji (validated with `parseEmoji` — invalid input is discarded), and individual button style (for Buttons display mode) |
| **Staff Roles** | Ping roles (full access + notify), Viewer roles (read only), Add roles, Remove roles |
| **Rules** | TH min, min trophies, min league tier, require linked account, staff thread, allow claiming |
| **Questions** | Up to 5 text-input questions shown in a modal before ticket creation |
| **Categories** | Open / Sleep / Closed Discord category channels |
| **Naming** | Channel naming convention |

### Reordering types

The **Reorder** button (visible when 2+ types exist) opens a modal with a single multi-select menu listing all types. The user must select all types — the order of selection becomes the new display order. On submit, the entire `ticketTypes` array is replaced in the new order via `$set`.

### Apply Rules gate checks

Gate checks run in `fetchQualifyingAccounts` before the ticket channel is created. All require `requireLinkedAccount=true`:

| Field | Check |
|---|---|
| `thMin` | `player.townHallLevel >= thMin` |
| `minTrophies` | `player.trophies >= minTrophies` |
| `minLeagueTier` | `player.leagueTier.id >= Number(minLeagueTier)` |

League tier options are derived from `PLAYER_LEAGUE_MAP` (top 25 entries by ID). The key stored is the string league ID (e.g. `'105000034'`).

### Extra Buttons sub-flow (`editExtraButtonsFlow`)

Manages `panel.extraButtons` and `panel.extraButtonsPlacement`. Panel-level (not per-type). Two add flows:

- **Add Command Button** — modal with preset selector (currently only `link-add`), Label, Emoji, Style. Custom ID at render time: `this.createId({ cmd: eb.cmd, ...eb.args, ephemeral: true, defer: false })`. Max 10 total.
- **Add URL Button** — modal with Label, Emoji, URL. Renders as `ButtonStyle.Link`.

**Placement toggle** switches between `same-row` (extra buttons fill the Create Ticket row, overflow to next) and `new-row` (always start on a fresh action row). Saved immediately to DB.

Edit modal (per entry): Label + Emoji + Style (command buttons only) + Delete checkbox. `cmd`/`args`/`url` are immutable after creation.

### Dashboard collector

The dashboard uses a `createMessageComponentCollector` (10-minute timeout, filtered to the invoking user). On each button click the relevant modal or sub-flow is launched, then the dashboard embed is refreshed with current panel state.

---

## Posting a Panel (`/ticket-post`)

**Command:** `/ticket-post panel_name:<name> [channel:<channel>]`

**Required bot permissions (target channel):** `ViewChannel, SendMessages, AttachFiles, EmbedLinks, ReadMessageHistory, ManageMessages, ManageChannels, ManageRoles, CreatePrivateThreads, SendMessagesInThreads, MentionEveryone, UseExternalEmojis`

Fetches the panel from DB, builds the embed and button row(s), and posts `{ embeds: [embed], components: [rows] }` to the target channel.

### Display modes

| Mode | Condition | What is posted |
|---|---|---|
| **Select Menu** | `displayMode === 'menu'` or `>5 types` | Single "Create Ticket" button using `panel.button` config |
| **Buttons** | `displayMode === 'buttons'` and `≤5 types` | One button per application type using `type.buttonStyle` |

**Menu mode customId:**
```
cmd=ticket-open  action=open  pid=<panelId>  defer=false
```

**Buttons mode customId (per type):**
```
cmd=ticket-open  action=open  pid=<panelId>  bid=<typeId>  defer=false
```

`defer=false` tells the handler framework **not** to auto-defer, because the first response may need to be `showModal()`.

### Extra buttons in `buildPanelComponents`

`panel.extraButtons` are appended after the Create Ticket buttons and chunked into action rows of 5:

- **Command button** → `this.createId({ cmd: eb.cmd, ...eb.args, ephemeral: true, defer: false })` + `eb.style ?? ButtonStyle.Secondary`
- **URL button** → `ButtonStyle.Link` with `eb.url`

**Placement modes:**
- `same-row` (default) — Create Ticket buttons and extra buttons are merged into one flat list, then chunked. A Create Ticket row with 1 button + 4 extra buttons = single row.
- `new-row` — Create Ticket buttons are chunked separately, then extra buttons are chunked separately and appended.

Run `/ticket-post` again after editing extra buttons to push the updated panel message.

---

## Opening a Ticket (`ticket-open`)

**Required bot permissions (ticket channel):** `ViewChannel, SendMessages, AttachFiles, EmbedLinks, ReadMessageHistory, ManageMessages, ManageChannels, ManageRoles, CreatePrivateThreads, SendMessagesInThreads, MentionEveryone`

### Action routing

| `action` | Handler | Trigger |
|---|---|---|
| `open` | `openTicketFlow` | User clicks a panel button (menu or buttons mode) |
| `select-type` | `handleTypeSelect` | User picks a type from the select menu (menu mode, >1 type) |
| `accounts` | `handleAccountSelect` | User picks an account from the account select menu |
| `del-confirm` | `confirmDeleteTicket` | "Delete Ticket" button in ticket channel |
| `del-ticket` | `deleteTicketChannel` | Confirmation button to actually delete |
| `reply` | `sendReply` | "Reply" button — sends a saved reply with optional variable fill-in |
| `set-clan` | `setClan` | "Set Clan" button |
| `notify` | `toggleNotify` | "Notify Me" button — opt in/out of DM on status change |
| `claim` | `claimTicket` | "Claim" button — staff claims exclusive ownership (only shown if `allowClaim=true`) |
| `unclaim` | `unclaimTicket` | "Unclaim" button — claimer releases the ticket back to shared access |

### `openTicketFlow` logic

1. Load panel by `pid`.
2. If `ticketTypes.length === 0` → reply error.
3. If `args.bid` is present (buttons display mode) → find that type by ID and call `proceedWithType` directly.
4. If `ticketTypes.length === 1` → call `proceedWithType` directly.
5. If `ticketTypes.length >= 2` → show a `StringSelectMenu` with one option per type (up to 25).

### `proceedWithType` logic

Duplicate ticket check first (same panel + type + user with status `open` or `sleep`).

Then:

```
requireLinkedAccount=true AND questions exist
  → fetchQualifyingAccounts → showQuestionsModal (account select embedded at top)

requireLinkedAccount=true AND no questions
  → deferReply → showAccountSelect (separate select menu step)

requireLinkedAccount=false AND questions exist
  → showQuestionsModal (no account select)

requireLinkedAccount=false AND no questions
  → deferReply → createTicketChannel
```

**Key constraint:** `showModal()` must be the first response to an interaction. Any `deferReply()` before `showModal()` will throw. This is why the account select is embedded inside the questions modal when both features are active.

### `fetchQualifyingAccounts`

Fetches linked player tags for the user, calls the CoC API for each, then filters by:
- `thMin` — player town hall level
- `minTrophies` — player trophy count
- `minLeagueTier` — player league tier ID (numeric comparison against stored string ID)

Returns formatted options. Returns `null` and sends an ephemeral error listing unmet requirements if no accounts qualify.

### `showQuestionsModal`

- Modal has up to **5** components total.
- If `accountOptions` is provided, a `StringSelectMenuBuilder` (via `LabelBuilder.setStringSelectMenuComponent`) is added as the **first** component, and questions are capped at **4**.
- After `awaitModalSubmit`, reads the selected account tag via `submit.fields.getStringSelectValues(playerSelectId)?.[0]`, fetches the player, then calls `createTicketChannel`.

### `createTicketChannel`

1. Gets the next ticket count (max `count` in guild + 1).
2. Resolves channel name from `namingConvention`.
3. Builds permission overwrites:
   - `@everyone` — deny `ViewChannel`
   - **Bot** — allow `ViewChannel, SendMessages, AttachFiles, EmbedLinks, ReadMessageHistory, ManageMessages, ManageChannels, CreatePrivateThreads, SendMessagesInThreads`
   - **Creator** — allow `ViewChannel, SendMessages, AttachFiles, EmbedLinks, ReadMessageHistory`
   - **Ping roles** — allow `ViewChannel, SendMessages, AttachFiles, EmbedLinks, ReadMessageHistory, ManageMessages, ManageChannels`
   - **View-only roles** — allow `ViewChannel, SendMessages, ReadMessageHistory`
4. Creates the `GuildText` channel (placed in `openCategoryId` if set).
5. Inserts `TicketEntity` to DB.
6. Calls `postTicketEmbed` to post the CV2 ticket embed.
7. Applies `addRoleIds` / `removeRoleIds` to the creator.
8. Creates a private staff thread if `createStaffThread=true` and ping roles exist.
9. Logs `created` status change.

### Ticket embed (`postTicketEmbed` / `buildTicketContainer`)

Posted to the new ticket channel as a CV2 `ContainerBuilder`. After a Set Clan action, the embed is re-edited via `interaction.message.edit(...)` using the original interaction's message reference.

```
## Ticket #0001
Created by: @user                        [View Profile ↗]  ← SectionBuilder with link button
Created at: <timestamp>                                       only shown if accountTag is set;
Claimed by: @staff                       ← only shown when ticket.claimedBy is set
                                                              plain TextDisplay otherwise
─────────────────────────────────────────
Account: PlayerName (TH15) — #TAG        ← only if linked account used
─────────────────────────────────────────
Clan: ClanName — #TAG                    ← only if clan set via Set Clan
─────────────────────────────────────────
Q: Question 1
A: Answer text                           ← only if questions were answered
─────────────────────────────────────────
[Reply 💬]  [Set Clan 🏰]  [Notify Me 🔔]
─────────────────────────────────────────
[Claim 🔒]  [Delete Ticket 🗑️]  [⚔️ View Account]   ← Claim only if allowClaim=true and not claimed
[Unclaim 🔓]  [Delete Ticket 🗑️]  [⚔️ View Account] ← Unclaim shown instead when ticket.claimedBy set
─────────────────────────────────────────
@staffRole1 @staffRole2 @creator
```

- `View Profile` is a `ButtonStyle.Link` URL button (no customId, no handler).
- `View Account` routes to the `player` command (`cmd: 'player'`).
- All other buttons encode `cid=<channelId>` in their customId.
- Top-level flags (`SHOW_REPLY_BUTTON`, `SHOW_SET_CLAN_BUTTON`, `SHOW_NOTIFY_BUTTON`) can disable buttons without removing handlers.

---

## Ticket Lifecycle Commands

| Command | Description |
|---|---|
| `/ticket-close` | Set status → `closed`, move to `closedCategoryId` |
| `/ticket-reopen` | Set status → `open`, move back to `openCategoryId` |
| `/ticket-sleep` | Set status → `sleep`, move to `sleepCategoryId` |
| `/ticket-delete` | Hard delete the channel and update DB |
| `/ticket-info` | Show ticket metadata (panel, type, creator, account, status, trophies, league) |
| `/ticket-add` | Add a Discord member to the ticket channel |

---

## In-Ticket Actions

All buttons in the ticket channel send CV2-format responses (no `content` field — the message uses `MessageFlags.IsComponentsV2`).

| Button | Action | Notes |
|---|---|---|
| **Delete Ticket** | `del-confirm` → `del-ticket` | Two-step confirm; generates transcript before delete |
| **Reply** | `reply` | Shows saved reply select menu; supports variable fill-in modal for unknown vars |
| **Set Clan** | `set-clan` | Clan select menu (inline collector); updates `clanTag`/`clanName` on ticket and re-edits the embed via `interaction.message.edit` |
| **View Account** | routes to `player` cmd | Link button in ticket header (only shown when `accountTag` set); no in-file handler |
| **Notify Me** | `notify` | Toggles `notifyMeUserIds` array on ticket |
| **Claim** | `claim` | Sets `claimedBy`; adds claimer user overwrite; removes all `pingRoleIds`+`viewOnlyRoleIds` overwrites; rebuilds embed. Only staff (has a pingRoleId) can claim. Only shown if `btn.allowClaim=true`. |
| **Unclaim** | `unclaim` | Clears `claimedBy`; deletes claimer user overwrite; restores all role overwrites; rebuilds embed. Only the claimer can unclaim. |

---

## Channel Naming Conventions

Set per application type via `namingConvention`. Supported tokens:

| Token | Resolves to |
|---|---|
| `{count}` | Zero-padded ticket number (e.g. `0042`) |
| `{user}` | Creator's Discord username (alphanumeric, max 16 chars) |
| `{account_name}` | Linked CoC account name (alphanumeric, max 16 chars) |
| `{account_th}` | Linked account Town Hall level |
| `{status}` | Always `open` at creation |
| `{emoji_status}` | Empty string at creation |

The resolved name is further sanitized: non-alphanumeric chars become `-`, consecutive dashes collapsed, lowercased, max 100 chars.

**Default:** `ticket-{count}` → `ticket-0001`

---

## Logging

Three optional log channels per panel, configured in the **Logging** dashboard section:

| Event | Log channel key | Fires when |
|---|---|---|
| Button click | `buttonClick` | User clicks "Create Ticket" |
| Status change | `statusChange` | Ticket opened / closed / slept / reopened / claimed / unclaimed |
| Ticket close | `ticketClose` | Ticket deleted (transcript attached) |

---

## Discord CV2 Constraint

The ticket panel message (posted by `/ticket-post`) uses `MessageFlags.IsComponentsV2`. This means **all** interaction responses to components on that message must also use CV2 format — the `content` field is not allowed.

All handlers in `ticket-open.ts` that respond to in-channel buttons use `this.reply(text)` (a base-class helper) or inline `ContainerBuilder` objects. When a handler needs a select menu alongside text, it builds an inline `ContainerBuilder` with both `addTextDisplayComponents` and `addActionRowComponents`.

### Framework defer behavior

`src/lib/handlers.ts` auto-defers interactions based on the customId args:

- `defer: false` in args → **no auto-defer** (required for `showModal()` to work as first response)
- `ephemeral: true` in args → `deferReply({ flags: MessageFlags.Ephemeral })`
- Default → `deferUpdate()`
