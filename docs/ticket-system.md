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

  embed: {
    title?: string;
    description?: string;
    color?: number;              // hex integer
    imageUrl?: string;
    thumbnailUrl?: string;
    footerText?: string;
  };

  button: {                      // the single "Create Ticket" Discord button
    label: string;               // default: "Create Ticket"
    emoji?: string;              // default: "📩"
    style: number;               // ButtonStyle enum value, default: Primary
  };

  ticketTypes: TicketTypeConfig[];  // application type options (shown in select menu if >1)

  logChannels: {
    buttonClick?: string;        // channel ID for button click logs
    statusChange?: string;       // channel ID for status change logs
    ticketClose?: string;        // channel ID for ticket close logs
  };

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

  // Gate checks — evaluated before creating the channel
  requireLinkedAccount: boolean;
  thMin?: number;                // minimum Town Hall level
  maxAccounts?: number;
  heroRequirements?: { name: string; level: number }[];
  minWarStars?: number;

  // Application questions shown in a modal before ticket creation
  questions?: { label: string; placeholder?: string; required: boolean }[];

  // Staff role permissions
  pingRoleIds: string[];         // full access + ManageMessages/ManageChannels
  viewOnlyRoleIds: string[];     // ViewChannel + SendMessages, no manage

  // Role changes applied to ticket creator on open
  addRoleIds: string[];
  removeRoleIds: string[];

  // Channel placement
  openCategoryId?: string;
  sleepCategoryId?: string;
  closedCategoryId?: string;

  namingConvention: string;      // see Channel Naming Conventions
  messageTemplates: { name: string; content: string }[];  // saved staff replies
  createStaffThread: boolean;    // create a private thread for staff on ticket open
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
      messageTemplates: [],
      createStaffThread: false
    }
  ],
  logChannels: {}
}
```

### Dashboard sections

The dashboard is a CV2 container with **Edit** buttons for each section:

| Section | What it configures |
|---|---|
| **Embed** | Panel embed: title, description, hex color |
| **Create Ticket Button** | The single Discord button: label, emoji, style (Primary/Secondary/Success/Danger) |
| **Application Types** | Add/edit/remove application types (shown as select menu to users if >1 type) |
| **Staff Roles** | Ping roles (full access) and view-only roles per application type |
| **Apply Rules** | TH minimum, max accounts, war stars, require linked account |
| **Questions** | Up to 5 questions (text inputs) shown in a modal before ticket creation |
| **Saved Replies** | Staff reply templates |
| **Categories** | Open / Sleep / Closed Discord category channels |
| **Naming** | Channel naming convention |
| **Logging** | Log channels for button click, status change, ticket close events |

### Dashboard collector

The dashboard uses a `createMessageComponentCollector` (10-minute timeout, filtered to the invoking user). On each button click the relevant modal or sub-flow is launched, then the dashboard embed is refreshed with current panel state.

---

## Posting a Panel (`/ticket-post`)

**Command:** `/ticket-post panel_name:<name> [channel:<channel>]`

Fetches the panel from DB, builds the embed and a single **"Create Ticket"** `ButtonBuilder`, and posts `{ embeds: [embed], components: [row] }` to the target channel.

The button's customId encodes:

```
cmd=ticket-open  action=open  pid=<panelId>  defer=false
```

`defer=false` tells the handler framework **not** to auto-defer this interaction, because the first response may need to be `showModal()`.

---

## Opening a Ticket (`ticket-open`)

### Action routing

| `action` | Handler | Trigger |
|---|---|---|
| `open` | `openTicketFlow` | User clicks "Create Ticket" button on panel |
| `select-type` | `handleTypeSelect` | User picks an application type from the select menu |
| `accounts` | `handleAccountSelect` | User picks an account from the standalone account select |
| `del-confirm` | `confirmDeleteTicket` | "Delete Ticket" button in ticket channel |
| `del-ticket` | `deleteTicketChannel` | Confirmation button to actually delete |
| `respond` | `sendResponse` | "Respond" button — sends a saved reply or custom message |
| `set-clan` | `setClan` | "Set Clan" button |
| `set-clan-select` | `setClanSelect` | Clan select menu submission |
| `view-acc` | `viewAccount` | "View Account" button — shows linked CoC account |
| `notify` | `toggleNotify` | "Notify Me" button — opt in/out of DM on status change |

### `openTicketFlow` logic

1. Load panel by `pid`.
2. If `ticketTypes.length === 0` → reply error.
3. If `ticketTypes.length === 1` → call `proceedWithType` directly.
4. If `ticketTypes.length >= 2` → show a `StringSelectMenu` with one option per type (up to 25).

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

Fetches linked player tags for the user, calls the CoC API for each, filters by `thMin`, returns formatted options. Returns `null` and sends an ephemeral error if no accounts qualify.

### `showQuestionsModal`

- Modal has up to **5** components total.
- If `accountOptions` is provided, a `StringSelectMenuBuilder` (via `LabelBuilder.setStringSelectMenuComponent`) is added as the **first** component, and questions are capped at **4**.
- After `awaitModalSubmit`, reads the selected account tag via `submit.fields.getStringSelectValues(playerSelectId)?.[0]`, fetches the player, then calls `createTicketChannel`.

### `createTicketChannel`

1. Gets the next ticket count (max `count` in guild + 1).
2. Resolves channel name from `namingConvention`.
3. Builds permission overwrites (everyone denied, creator allowed, ping roles full access, view-only roles read/send).
4. Creates the `GuildText` channel (placed in `openCategoryId` if set).
5. Inserts `TicketEntity` to DB.
6. Calls `postTicketEmbed` to post the CV2 ticket embed.
7. Applies `addRoleIds` / `removeRoleIds` to the creator.
8. Creates a private staff thread if `createStaffThread=true` and ping roles exist.
9. Logs `created` status change.

### Ticket embed (`postTicketEmbed`)

Posted to the new ticket channel as a CV2 `ContainerBuilder`:

```
## Ticket #0001                          [avatar button]
Created by: @user
Created at: <timestamp>
─────────────────────────────────────────
Account: PlayerName (TH15) — #TAG        ← only if linked account used
─────────────────────────────────────────
Q: Question 1
A: Answer text
                                         ← only if questions answered
Q: Question 2
A: Answer text
─────────────────────────────────────────
[Delete Ticket] [Respond] [Set Clan] [View Account] [Notify Me]
```

Action buttons in the ticket channel all encode `cid=<channelId>` in their customId.

---

## Ticket Lifecycle Commands

| Command | Description |
|---|---|
| `/ticket-close` | Set status → `closed`, move to `closedCategoryId` |
| `/ticket-reopen` | Set status → `open`, move back to `openCategoryId` |
| `/ticket-sleep` | Set status → `sleep`, move to `sleepCategoryId` |
| `/ticket-delete` | Hard delete the channel and update DB |
| `/ticket-info` | Show ticket metadata (panel, type, creator, account, status) |
| `/ticket-add` | Add a Discord member to the ticket channel |

---

## In-Ticket Actions

All buttons in the ticket channel send CV2-format responses (no `content` field — the message uses `MessageFlags.IsComponentsV2`).

| Button | Action | Notes |
|---|---|---|
| **Delete Ticket** | `del-confirm` → `del-ticket` | Two-step confirm; generates transcript before delete |
| **Respond** | `respond` | Shows saved reply templates or free-text input |
| **Set Clan** | `set-clan` | Clan select menu; stored on ticket as `clanTag`/`clanName` |
| **View Account** | `view-acc` | Shows linked CoC player profile; only if `accountTag` set |
| **Notify Me** | `notify` | Toggles DM notifications for ticket status changes |

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
| Status change | `statusChange` | Ticket opened / closed / slept / reopened |
| Ticket close | `ticketClose` | Ticket deleted (transcript attached) |

---

## Discord CV2 Constraint

The ticket panel message (posted by `/ticket-post`) uses `MessageFlags.IsComponentsV2`. This means **all** interaction responses to components on that message must also use CV2 format — the `content` field is not allowed.

All handlers in `ticket-open.ts` that respond to in-channel buttons use the `cv2Reply(text)` helper or inline `ContainerBuilder` objects:

```ts
private cv2Reply(text: string): InteractionEditReplyOptions {
  return {
    components: [new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(text))],
    flags: MessageFlags.IsComponentsV2
  };
}
```

When a handler needs to show a select menu in addition to text, it builds an inline `ContainerBuilder` with both `addTextDisplayComponents` and `addActionRowComponents`.

### Framework defer behavior

`src/lib/handlers.ts` auto-defers interactions based on the customId args:

- `defer: false` in args → **no auto-defer** (required for `showModal()` to work as first response)
- `ephemeral: true` in args → `deferReply({ flags: MessageFlags.Ephemeral })`
- Default → `deferUpdate()`
