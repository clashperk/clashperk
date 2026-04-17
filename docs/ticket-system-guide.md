# Ticket System Guide

A step-by-step guide for server admins and members on how to use the ClashPerk ticket system.

---

## Table of Contents

- [For Server Admins](#for-server-admins)
  - [Quick Start](#quick-start)
  - [Step 1 — Create & Configure a Panel](#step-1--create--configure-a-panel)
  - [Step 2 — Configure Application Types](#step-2--configure-application-types)
  - [Step 3 — Post the Panel](#step-3--post-the-panel)
  - [Panel Settings Reference](#panel-settings-reference)
  - [Application Type Settings Reference](#application-type-settings-reference)
  - [Channel Naming Tokens](#channel-naming-tokens)
  - [Managing Tickets](#managing-tickets-staff)
- [For Members](#for-members)
  - [Opening a Ticket](#opening-a-ticket)
  - [Inside Your Ticket](#inside-your-ticket)

---

## For Server Admins

### Quick Start

1. Run `/ticket-setup panel_name:Applications` to create and configure your panel.
2. Configure the panel's embed, button, application types, staff roles, etc.
3. Click **Done** when finished.
4. Run `/ticket-post panel_name:Applications` (or with `channel:`) to send the panel to your desired channel.
5. Members can now click the button to open tickets.

---

### Step 1 — Create & Configure a Panel

```
/ticket-setup panel_name:<name>
```

- If a panel with that name doesn't exist, one is created automatically with a default **General** application type.
- A dashboard opens in the channel with **Edit** buttons for every setting.
- The dashboard times out after **10 minutes** of inactivity. Click **Done** to save and close early.
- You can re-open the dashboard any time by running `/ticket-setup` again with the same name.

> Each panel is identified by its name. You can have multiple panels per server (e.g. one for clan applications, one for support).

---

### Step 2 — Configure Application Types

Click **Edit** next to **Application Types** in the dashboard.

An application type is an option shown to the user when they click the ticket button. If you only have **one** type, users skip the selection step and the ticket opens immediately. If you have **two or more**, a select menu appears.

**To add a type:** click **Add Type**, enter a label and optional emoji.

**To edit a type:** click **Edit / Delete** next to it. You can configure:

| Setting | Description |
|---|---|
| Label / Emoji | Name and icon shown in the select menu |
| Staff Roles | Which roles are notified and can manage the ticket |
| Apply Rules | TH minimum, war stars, max linked accounts, require CoC link |
| Questions | Up to 5 questions shown to the user before the ticket opens |
| Saved Replies | Pre-written messages staff can send in one click |
| Categories | Which Discord categories to place open / sleeping / closed tickets |
| Naming | Channel name format (see [Channel Naming Tokens](#channel-naming-tokens)) |

> You can have up to **25 application types** per panel.

---

### Step 3 — Post the Panel

```
/ticket-post panel_name:<name>
/ticket-post panel_name:<name> channel:#applications
```

This posts the configured embed and a **Create Ticket** button to the channel. Members can now click it to open tickets.

> Run `/ticket-post` again any time you want to refresh the panel message (e.g. after changing the embed).

---

### Panel Settings Reference

These settings apply to the whole panel and are configured from the main dashboard.

#### Embed

The message shown above the Create Ticket button.

| Field | Description | Limit |
|---|---|---|
| Title | Bold heading | 256 chars |
| Description | Body text (markdown supported) | 2000 chars |
| Color | Hex color for the embed border (e.g. `#5865F2`) | — |

#### Create Ticket Button

The single button members click to start the flow.

| Field | Options |
|---|---|
| Label | Any text (default: `Create Ticket`) |
| Emoji | Optional emoji before the label (default: `📩`) |
| Style | Primary (blue) / Secondary (grey) / Success (green) / Danger (red) |

#### Logging

Send events to specific channels for record-keeping.

| Event | When it fires |
|---|---|
| Button click | A member clicks the Create Ticket button |
| Status change | A ticket is opened, closed, put to sleep, or reopened |
| Ticket close | A ticket channel is deleted (transcript attached) |

---

### Application Type Settings Reference

Each application type has its own independent settings.

#### Staff Roles

| Role type | Channel permissions granted |
|---|---|
| **Ping roles** | View, Send Messages, Attach Files, Embed Links, Manage Messages, Manage Channels |
| **View-only roles** | View, Send Messages, Read Message History only |

Ping roles are also mentioned in the ticket channel when the ticket is created.

#### Apply Rules

Gates checked before the ticket channel is created. If a member doesn't meet the requirements they see an error and no ticket is created.

| Rule | Description |
|---|---|
| **Require linked account** | Member must have a Clash of Clans account linked via `/link add` |
| **TH minimum** | Linked account must be at least this Town Hall level |
| **Max accounts** | Limit how many accounts can be submitted per application |
| **Min war stars** | Linked account must have at least this many war stars |

#### Questions

Up to **5** questions shown in a pop-up modal before the ticket opens. Each question can be marked required or optional. If **Require linked account** is also enabled, an account selector is shown at the top of the modal (reducing the question limit to **4**).

#### Saved Replies

Pre-written message templates that staff can send inside a ticket with one click using the **Respond** button. Useful for common answers, acceptance/rejection messages, etc.

Templates support these variables:

| Variable | Replaced with |
|---|---|
| `{user}` | Ticket creator's Discord mention |
| `{clan}` | Clan name (if set on the ticket) |
| `{account}` | Player name (if linked account was used) |

#### Categories

Discord categories the ticket channel is moved to as it changes state.

| Category | When used |
|---|---|
| **Open** | Channel is placed here when the ticket is first created |
| **Sleep** | Channel moves here when `/ticket-sleep` is run |
| **Closed** | Channel moves here when `/ticket-close` is run |

#### Channel Naming

Controls what the ticket channel is called. See [Channel Naming Tokens](#channel-naming-tokens) below.

---

### Channel Naming Tokens

Use these tokens in the **Naming** field of any application type:

| Token | Example output | Description |
|---|---|---|
| `{count}` | `0042` | Sequential ticket number (zero-padded to 4 digits) |
| `{user}` | `johndoe` | Creator's Discord username (alphanumeric only, max 16 chars) |
| `{account_name}` | `playerone` | Linked CoC account name (alphanumeric only, max 16 chars) |
| `{account_th}` | `15` | Linked account Town Hall level |

**Examples:**

| Convention | Result |
|---|---|
| `ticket-{count}` | `ticket-0001` *(default)* |
| `app-{user}-{count}` | `app-johndoe-0001` |
| `th{account_th}-{account_name}` | `th15-playerone` |

Non-alphanumeric characters are replaced with `-` and the name is capped at 100 characters.

---

### Managing Tickets (Staff)

Use these slash commands inside or targeting a ticket channel:

| Command | Description |
|---|---|
| `/ticket-close` | Close the ticket — sets status to closed, moves to the closed category |
| `/ticket-reopen` | Reopen a closed or sleeping ticket |
| `/ticket-sleep` | Put a ticket to sleep — moves to the sleep category |
| `/ticket-delete` | Permanently delete the ticket channel (generates a transcript first) |
| `/ticket-info` | Show ticket details: creator, linked account, status, panel, type |
| `/ticket-add member:@user` | Add a Discord member to the ticket channel |

---

## For Members

### Opening a Ticket

1. Find the ticket panel posted in a channel (usually named `#apply` or `#open-a-ticket`).
2. Click the **Create Ticket** button.
3. If the panel has multiple ticket types, a dropdown menu appears — select the type that matches your request.
4. If the type requires a linked Clash of Clans account, you'll be prompted to select which account to apply with.
5. If the type has questions, a pop-up form appears. Fill in the answers and submit.
6. A private channel is created just for you and the staff team. You'll see a link to it in the reply.

> If you already have an open ticket for the same type, you'll be shown a link to your existing ticket instead of creating a new one.

**Common errors:**

| Error | What to do |
|---|---|
| *You need a linked Clash of Clans account* | Run `/link add` to link your account first |
| *None of your linked accounts meet the requirements* | Check the minimum TH level or war stars required for this application type |
| *You already have an open ticket* | Your ticket is already open — click the link provided |

---

### Inside Your Ticket

Once your ticket channel is open, you'll see a summary card with your details and a row of action buttons.

| Button | What it does |
|---|---|
| **Delete Ticket** | Close and delete the ticket (asks for confirmation first) |
| **Respond** | *(Staff only)* Send a saved reply or custom message |
| **Set Clan** | Attach a clan to this ticket — useful if your application is for a specific clan |
| **View Account** | Show the Clash of Clans profile for the account linked to this ticket |
| **Notify Me** | Toggle DM notifications — get a direct message when the ticket status changes |

> Only ticket creators and staff with the configured roles can see the ticket channel.
