import { Collections } from '@app/constants';
import { achievements, PlayerSeasonsEntity } from '@app/entities';
import { APIClan, APIClanMember } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
import { sum } from 'radash';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';
import { Season } from '../../util/toolkit.js';

export default class ExportSeason extends Command {
  public constructor() {
    super('export-season', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['AttachFiles', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { season?: string; clans?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const season = args.season ?? Season.ID;
    const _clanTags = clans.map((clan) => clan.tag);
    const _clans = await this.client.http._getClans(clans);
    const _members = _clans.reduce<(APIClanMember & { clanTag: string })[]>((previous, current) => {
      previous.push(...current.memberList.map((mem) => ({ ...mem, clanTag: current.tag })));
      return previous;
    }, []);
    const members = (await Promise.all(_clans.map((clan) => this.aggregationQuery(clan, season)))).flat();

    const linksMap = await this.client.resolver.getLinkedUsersMap(_members);
    const guildMembers = await interaction.guild.members.fetch();
    for (const member of members) {
      const link = linksMap[member.tag];
      if (!link) continue;

      const guildMember = guildMembers.get(link.userId);
      member.userId = guildMember?.id ?? link.userId;
      member.username = guildMember?.user.username ?? link.username;
      member.displayName = guildMember?.user.displayName ?? link.displayName;
    }

    const __achievements = (
      [
        'War League Legend',
        'Gold Grab',
        'Elixir Escapade',
        'Heroic Heist',
        'Games Champion',
        'Aggressive Capitalism',
        'Most Valuable Clanmate'
      ] as const
    ).map((a) => achievements[a]);

    if (!members.length) {
      return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
    }

    const sheets: CreateGoogleSheet[] = [
      {
        columns: [
          { name: 'Name', width: 160, align: 'LEFT' },
          { name: 'Tag', width: 120, align: 'LEFT' },
          { name: 'Discord', width: 160, align: 'LEFT' },
          { name: 'Username', width: 160, align: 'LEFT' },
          { name: 'ID', width: 160, align: 'LEFT' },
          { name: 'Current Clan', width: 160, align: 'LEFT' },
          { name: 'Town Hall', width: 100, align: 'RIGHT' },
          { name: 'Total Donated', width: 100, align: 'RIGHT' },
          { name: 'Total Received', width: 100, align: 'RIGHT' },
          { name: 'Total Attacks', width: 100, align: 'RIGHT' },
          { name: 'Versus Attacks', width: 100, align: 'RIGHT' },
          { name: 'Trophies Gained', width: 100, align: 'RIGHT' },
          { name: 'Season-End Trophies', width: 100, align: 'RIGHT' },
          { name: 'Versus-Trophies Gained', width: 100, align: 'RIGHT' },
          { name: 'War-Stars Gained', width: 100, align: 'RIGHT' },
          { name: 'CWL-Stars Gained', width: 100, align: 'RIGHT' },
          { name: 'Gold Looted', width: 100, align: 'RIGHT' },
          { name: 'Elixir Looted', width: 100, align: 'RIGHT' },
          { name: 'Dark Elixir Looted', width: 100, align: 'RIGHT' },
          { name: 'Clan Games', width: 100, align: 'RIGHT' },
          { name: 'Capital Gold Looted', width: 100, align: 'RIGHT' },
          { name: 'Capital Gold Contributed', width: 100, align: 'RIGHT' },
          { name: 'Activity Score', width: 100, align: 'RIGHT' }
        ],
        rows: members.map((m) => [
          m.name,
          m.tag,
          m.displayName,
          m.username,
          m.userId,
          m.clans?.[m.clanTag]?.name,
          m.townHallLevel,
          sum(Object.values(m.clans ?? {}), (clan) => (_clanTags.includes(clan.tag) ? clan.donations.total : 0)),
          sum(Object.values(m.clans ?? {}), (clan) => (_clanTags.includes(clan.tag) ? clan.donationsReceived.total : 0)),
          m.attackWins,
          m.versusBattleWins.current - m.versusBattleWins.initial,
          m.trophies.current - m.trophies.initial,
          m.trophies.current,
          m.versusTrophies.current - m.versusTrophies.initial,
          m.clanWarStars.current - m.clanWarStars.initial,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          ...__achievements.map((ac) => (m[ac]?.current ?? 0) - (m[ac]?.initial ?? 0)),
          m.score ?? 0
        ]),
        title: `Season ${season}`
      }
    ];

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Season Stats: ${season}]`, sheets);
    return interaction.editReply({ content: `**Season Export (${season})**`, components: getExportComponents(spreadsheet) });
  }

  private async aggregationQuery(clan: APIClan, seasonId: string) {
    const cursor = this.client.db.collection(Collections.PLAYER_SEASONS).aggregate<PlayerSeasonModelAggregated>([
      {
        $match: {
          season: seasonId,
          __clans: clan.tag,
          tag: { $in: clan.memberList.map((m) => m.tag) }
        }
      },
      {
        $lookup: {
          from: Collections.PLAYERS,
          localField: 'tag',
          foreignField: 'tag',
          as: 'lastSeen',
          pipeline: [{ $project: { seasons: 1 } }]
        }
      },
      {
        $unwind: {
          path: '$lastSeen',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $set: {
          score: `$lastSeen.seasons.${seasonId}`,
          clans: {
            [clan.tag]: `$clans.${clan.tag}`
          },
          clanTag: clan.tag
        }
      },
      {
        $unset: 'lastSeen'
      },
      {
        $lookup: {
          from: Collections.CLAN_GAMES_POINTS,
          localField: 'tag',
          foreignField: 'tag',
          as: 'clanGamesPoints',
          pipeline: [
            {
              $match: {
                season: seasonId
              }
            },
            {
              $project: {
                initial: 1,
                current: 1
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: '$clanGamesPoints',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    return cursor.toArray();
  }
}

type PlayerSeasonModelAggregated = PlayerSeasonsEntity & {
  score?: number;
  clanTag: string;
  displayName?: string;
  username?: string;
  userId?: string;
};
