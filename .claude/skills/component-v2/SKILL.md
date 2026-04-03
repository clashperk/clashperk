---
name: component-v2
description: Use this skill when the user wants to build a Discord Components v2 message, use ContainerBuilder, SectionBuilder, TextDisplayBuilder, FileBuilder, SeparatorBuilder, or send a message with MessageFlags.IsComponentsV2. Triggers on requests like "build a components v2 message", "use container builder", "send a v2 embed", or "create a discord components v2 layout".
version: 0.1.0
---

# Discord Components v2

Components v2 is Discord's new message layout system (discord.js `14.19.0+`). Instead of embeds, you compose `ContainerBuilder` with typed child components. Messages must set `MessageFlags.IsComponentsV2`.

---

## Required Imports

```ts
import {
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  FileBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from 'discord.js';
```

---

## Core Builders

| Builder | Purpose |
|---|---|
| `ContainerBuilder` | Root wrapper — all other components are added here |
| `TextDisplayBuilder` | Markdown text block (supports headings, lists, `-#` subtext) |
| `SectionBuilder` | Side-by-side text + button accessory |
| `SeparatorBuilder` | Visual divider with spacing control |
| `FileBuilder` | Attached file preview (uses `attachment://filename`) |
| `ButtonBuilder` | Action/link button — used as accessory or in action rows |

---

## Canonical Pattern

```ts
const container = new ContainerBuilder();

// Plain text block
container.addTextDisplayComponents(
  new TextDisplayBuilder().setContent('## Hello\n-# subtext here'),
);

// Section: text + button side by side
const section = new SectionBuilder()
  .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Section title\n- bullet'))
  .setButtonAccessory(
    new ButtonBuilder()
      .setLabel('Open')
      .setStyle(ButtonStyle.Link)
      .setURL('https://example.com'),
  );
container.addSectionComponents(section);

// Separator
container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Large));

// Action row with standalone button
container.addActionRowComponents(row =>
  row.addComponents(
    new ButtonBuilder().setLabel('Click me').setStyle(ButtonStyle.Link).setURL('https://example.com'),
  ),
);

// Attached file preview
container.addFileComponents(new FileBuilder().setURL('attachment://file.ts'));

// Send — IsComponentsV2 flag is mandatory
await interaction.reply({
  components: [container],
  files: [new AttachmentBuilder(buffer, { name: 'file.ts' })],
  flags: MessageFlags.IsComponentsV2,
});
```

---

## Text Formatting Tips

- `## Heading` — works inside `TextDisplayBuilder`
- `-# text` — Discord subtext (smaller, muted)
- `<a:emoji:id>` — animated emoji inline
- Standard markdown (bold, italic, links) is supported

---

## Rules

1. **`MessageFlags.IsComponentsV2` is required** — omitting it causes the message to render incorrectly.
2. `FileBuilder.setURL()` must use the `attachment://filename` scheme matching the `AttachmentBuilder` name.
3. `SectionBuilder` accepts exactly one button accessory via `.setButtonAccessory()`.
4. Do not mix Components v2 containers with legacy embeds in the same message.
