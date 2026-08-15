import { Collections, LEGEND_LEAGUE_ID, UNRANKED_TIER_ID } from '@app/constants';
import { GlobalPlayersEntity, PlayersEntity } from '@app/entities';
import { APIPlayer } from 'clashofclans.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { api, encode } from '../api/axios.js';
import { Client } from './client.js';

export class PlayerSync {
  public constructor(private readonly client: Client) {}

  public async reSyncClanHistory(player: APIPlayer) {
    const clanHistoryRepository = this.client.globalDb.collection('global_clan_history');
    const playersRepository =
      this.client.globalDb.collection<GlobalPlayersEntity>('global_players');
    const clansRepository = this.client.globalDb.collection('global_clans');

    const entity = await playersRepository.findOne({ tag: player.tag });

    const clanTag = player.clan?.tag ?? '#00000';
    const trackingId = entity && entity.clanTag === clanTag ? entity.trackingId : new ObjectId();

    if (!entity || entity.clanTag !== clanTag) {
      await playersRepository.updateOne(
        { tag: player.tag },
        {
          $setOnInsert: {
            createdAt: new Date()
          },
          $set: {
            name: player.name,
            townHall: player.townHallLevel,
            trophies: player.trophies,
            donations: player.donations,
            attackWins: player.attackWins,
            leagueId: player.leagueTier?.id ?? UNRANKED_TIER_ID,
            clanTag,
            trackingId
          }
        },
        {
          upsert: true
        }
      );
    }

    await clanHistoryRepository.updateOne(
      { playerTag: player.tag, trackingId },
      {
        $setOnInsert: {
          firstSeen: new Date()
        },
        $set: {
          clanTag,
          lastSeen: new Date()
        }
      },
      {
        upsert: true
      }
    );

    if (!player.clan) return;

    await clansRepository.updateOne(
      {
        tag: clanTag
      },
      {
        $setOnInsert: {
          createdAt: new Date(),
          teamSize: 0
        },
        $set: {
          name: player.clan.name,
          level: player.clan.clanLevel
        }
      },
      {
        upsert: true
      }
    );
  }

  public async reSyncLegends(player: APIPlayer) {
    await this.client.db.collection<PlayersEntity>(Collections.PLAYERS).updateOne(
      { tag: player.tag },
      {
        $setOnInsert: {
          lastSeen: moment().subtract(1, 'day').toDate()
        },
        $set: {
          name: player.name,
          townHallLevel: player.townHallLevel,
          leagueId:
            player.leagueTier?.id ??
            (player.trophies >= 5000 ? LEGEND_LEAGUE_ID : UNRANKED_TIER_ID),
          clan: player.clan ? { name: player.clan.name, tag: player.clan.tag } : {},
          lastSearched: new Date()
        }
      },
      {
        upsert: true
      }
    );
    await api.players.addPlayerAccount({ playerTag: encode(player.tag) });
  }
}
