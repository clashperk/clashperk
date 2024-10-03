import { Collections } from '@app/constants';
import { APIClan } from 'clashofclans.js';
import { EmbedBuilder, Guild } from 'discord.js';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { EMOJIS } from '../util/emojis.js';
import { escapeBackTick, localeSort } from '../util/helper.js';
import { Util } from '../util/toolkit.js';

// not in use
export const linkListEmbedMaker = async ({ clan, guild, showTag }: { clan: APIClan; guild: Guild; showTag?: boolean }) => {
  const client = container.resolve(Client);
  const memberTags = await client.coc.getDiscordLinks(clan.memberList);
  const dbMembers = await client.db
    .collection(Collections.PLAYER_LINKS)
    .find({ tag: { $in: clan.memberList.map((m) => m.tag) } })
    .toArray();

  const members: { name: string; tag: string; userId: string; verified: boolean }[] = [];
  for (const m of memberTags) {
    const clanMember = clan.memberList.find((mem) => mem.tag === m.tag);
    if (!clanMember) continue;
    members.push({ tag: m.tag, userId: m.userId, name: clanMember.name, verified: false });
  }

  for (const member of dbMembers) {
    const clanMember = clan.memberList.find((mem) => mem.tag === member.tag);
    if (!clanMember) continue;

    const mem = members.find((mem) => mem.tag === member.tag);
    if (mem) mem.verified = member.verified;
    else members.push({ tag: member.tag, userId: member.userId, name: clanMember.name, verified: member.verified });
  }

  const guildMembers = await guild.members.fetch();
  // players linked and on the guild.
  const onDiscord = members.filter((mem) => guildMembers.has(mem.userId));
  // linked to discord but not on the guild.
  const notInDiscord = members.filter((mem) => !guildMembers.has(mem.userId));
  // not linked to discord.
  const notLinked = clan.memberList.filter(
    (m) => !notInDiscord.some((en) => en.tag === m.tag) && !members.some((en) => en.tag === m.tag && guildMembers.has(en.userId))
  );

  const chunks = Util.splitMessage(
    [
      `${EMOJIS.DISCORD} **Players on Discord: ${onDiscord.length}**`,
      onDiscord
        .map((mem) => {
          const name = escapeBackTick(mem.name).padEnd(15, ' ');
          const member = clan.memberList.find((m) => m.tag === mem.tag)!;
          const user = showTag ? member.tag.padStart(12, ' ') : guildMembers.get(mem.userId)!.displayName.slice(0, 12).padStart(12, ' ');
          return { name, user, verified: mem.verified };
        })
        .sort((a, b) => localeSort(a.name, b.name))
        .map(({ name, user, verified }) => {
          return `${verified ? '**✓**' : '✘'} \`\u200e${name}\u200f\` \u200e \` ${user} \u200f\``;
        })
        .join('\n'),
      notInDiscord.length ? `\n${EMOJIS.WRONG} **Players not on Discord: ${notInDiscord.length}**` : '',
      notInDiscord
        .map((mem) => {
          const name = escapeBackTick(mem.name).padEnd(15, ' ');
          const member = clan.memberList.find((m) => m.tag === mem.tag)!;
          const user: string = member.tag.padStart(12, ' ');
          return { name, user, verified: mem.verified };
        })
        .sort((a, b) => localeSort(a.name, b.name))
        .map(({ name, user, verified }) => {
          return `${verified ? '**✓**' : '✘'} \`\u200e${name}\u200f\` \u200e \` ${user} \u200f\``;
        })
        .join('\n'),
      notLinked.length ? `\n${EMOJIS.WRONG} **Players not Linked: ${notLinked.length}**` : '',
      notLinked
        .sort((a, b) => localeSort(a.name, b.name))
        .map((mem) => {
          const name = escapeBackTick(mem.name).padEnd(15, ' ');
          return `✘ \`\u200e${name}\u200f\` \u200e \` ${mem.tag.padStart(12, ' ')} \u200f\``;
        })
        .join('\n')
    ]
      .filter((text) => text)
      .join('\n'),
    { maxLength: 4096 }
  );

  const embed = new EmbedBuilder()
    .setColor(client.embed(guild.id))
    .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
    .setDescription(chunks.at(0)!);
  if (chunks.length > 1) {
    embed.addFields(chunks.slice(1).map((chunk) => ({ name: '\u200b', value: chunk })));
  }

  return embed;
};
