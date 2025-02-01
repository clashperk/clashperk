import { APIClan } from 'clashofclans.js';
import { EmbedBuilder, Guild } from 'discord.js';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { padEnd, padStart } from '../util/helper.js';

// not in use
export const attacksEmbedMaker = async ({
  clan,
  guild,
  sortKey
}: {
  clan: APIClan;
  guild: Guild;
  sortKey: 'attackWins' | 'defenseWins';
}) => {
  const client = container.resolve(Client);

  const fetched = await client.coc._getPlayers(clan.memberList);
  const members = fetched.map((data) => ({
    name: data.name,
    tag: data.tag,
    attackWins: data.attackWins,
    defenseWins: data.defenseWins
  }));
  members.sort((a, b) => b[sortKey] - a[sortKey]);

  const embed = new EmbedBuilder()
    .setColor(client.embed(guild.id))
    .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
    .setDescription(
      [
        '```',
        `\u200e ${'#'}  ${'ATK'}  ${'DEF'}  ${padEnd('NAME', 15)}`,
        members
          .map((member, i) => {
            const name = padEnd(member.name.replace(/\`/g, '\\'), 15);
            const attackWins = padStart(member.attackWins, 3);
            const defenseWins = padStart(member.defenseWins, 3);
            return `${padStart(i + 1, 2)}  ${attackWins}  ${defenseWins}  \u200e${name}`;
          })
          .join('\n'),
        '```'
      ].join('\n')
    );

  return embed;
};
