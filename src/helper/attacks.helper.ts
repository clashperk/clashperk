import { APIClan } from 'clashofclans.js';
import { EmbedBuilder, Guild } from 'discord.js';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';

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
        `\u200e ${'#'}  ${'ATK'}  ${'DEF'}  ${'NAME'.padEnd(15, ' ')}`,
        members
          .map((member, i) => {
            const name = `${member.name.replace(/\`/g, '\\').padEnd(15, ' ')}`;
            const attackWins = `${member.attackWins.toString().padStart(3, ' ')}`;
            const defenseWins = `${member.defenseWins.toString().padStart(3, ' ')}`;
            return `${(i + 1).toString().padStart(2, ' ')}  ${attackWins}  ${defenseWins}  \u200e${name}`;
          })
          .join('\n'),
        '```'
      ].join('\n')
    );

  return embed;
};
