import { CommandInteraction, EmbedBuilder, time, User } from 'discord.js';
import ms from 'ms';
import { Command } from '../../lib/index.js';

export default class ClanHistoryCommand extends Command {
  public constructor() {
    super('clan-history', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag: string; user?: User }) {
    const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
    if (!data) return;

    const clans = await this.client.globalDb
      .collection('global_clan_history')
      .aggregate<GlobalClanHistoryEntity>([
        {
          $match: {
            playerTag: data.tag
          }
        },
        {
          $lookup: {
            from: 'global_clans',
            localField: 'clanTag',
            foreignField: 'tag',
            as: 'clan'
          }
        },
        {
          $unwind: {
            path: '$clan'
          }
        },
        {
          $sort: {
            lastSeen: -1
          }
        }
      ])
      .toArray();

    const mostStayedClansMap = clans.reduce<Record<string, { clan: GlobalClanEntity; stay: number }>>(
      (record, { firstSeen, lastSeen, clan }) => {
        const diff = lastSeen.getTime() - firstSeen.getTime();
        const stay = diff === 0 ? 0 : diff;
        if (!record[clan.tag]) {
          record[clan.tag] = { clan, stay };
        } else {
          record[clan.tag].stay += stay;
        }
        return record;
      },
      {}
    );
    const mostStayedClans = Object.values(mostStayedClansMap)
      .sort((a, b) => b.stay - a.stay)
      .filter((x) => x.stay > 0);

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`${data.name} (${data.tag})`)
      .setURL(`http://cprk.eu/p/${data.tag.replace('#', '')}`)
      .setDescription(
        [
          '### Longest-Staying Clans',
          ...mostStayedClans.slice(0, 5).map(({ clan, stay }) => {
            const stayTime = ms(stay);
            return `\u200e[${clan.name} (${clan.tag})](${this.hyperlink(clan.tag)}) - ${stayTime}`;
          }),

          '### Most Recent Clans',
          ...clans.slice(0, 10).map(({ clan, firstSeen, lastSeen }) => {
            const diff = lastSeen.getTime() - firstSeen.getTime();
            const stay = diff === 0 ? '' : `- ${ms(diff)}`;
            const timeFrame = diff === 0 ? `${time(firstSeen, 'f')}` : `${time(firstSeen, 'D')} to ${time(lastSeen, 'D')}`;
            return `\u200e[${clan.name} (${clan.tag})](${this.hyperlink(clan.tag)}) ${stay} \n-# ${timeFrame}\n`;
          })
        ].join('\n')
      );

    return interaction.editReply({ embeds: [embed] });
  }

  private hyperlink(tag: string) {
    return `http://cprk.eu/c/${tag.replace('#', '')}`;
  }
}

interface ClanHistoryEntity {
  playerTag: string;
  clanTag: string;
  firstSeen: Date;
  lastSeen: Date;
}

interface GlobalClanEntity {
  tag: string;
  name: string;
}

interface GlobalClanHistoryEntity extends ClanHistoryEntity {
  clan: GlobalClanEntity;
}
