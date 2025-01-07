import { GlobalPlayersEntity, PlayersEntity } from '@app/entities';
import { APIPlayer, UnrankedLeagueData, UnrankedLeagueId } from 'clashofclans.js';
import { ObjectId } from 'mongodb';
import { Client } from './client.js';
import { Collections, LEGEND_LEAGUE_ID } from '@app/constants';
import moment from 'moment';

export class ElasticIndexer {
  public constructor(private readonly client: Client) {}

  private async upsert(doc: SearchDocument, index: string) {
    const result = await this.client.elastic.search<SearchDocument>({
      index,
      query: { match: { id: doc.id } }
    });
    for (const hit of result.hits.hits) {
      if (!hit._id) continue;
      await this.client.elastic.delete({ index, id: hit._id });
    }

    return this.insert(doc, index);
  }

  private insert(doc: SearchDocument, index: string) {
    return this.client.elastic.index({ index, refresh: true, document: doc });
  }

  private async delete(id: string, index: string) {
    const result = await this.client.elastic.search({
      index,
      query: { match: { id } }
    });
    for (const hit of result.hits.hits) {
      if (!hit._id) continue;
      await this.client.elastic.delete({ index, refresh: true, id: hit._id });
    }
  }

  public async index(doc: RecentSearchDocument, index: string) {
    try {
      const result = await this.client.elastic.search<RecentSearchDocument>({
        index,
        query: { bool: { must: [{ match: { tag: doc.tag } }, { match: { userId: doc.userId } }] } }
      });
      for (const hit of result.hits.hits) {
        if (!hit._id) continue;
        await this.client.elastic.update({
          index,
          refresh: true,
          id: hit._id,
          doc: { lastSearched: Date.now() }
        });
      }
      if (!result.hits.hits.length) {
        await this.client.elastic.index({
          index,
          refresh: true,
          document: { ...doc, lastSearched: Date.now() }
        });
      }
    } catch {}
  }

  public async reSyncClanHistory(player: APIPlayer) {
    const clanHistoryRepository = this.client.globalDb.collection('global_clan_history');
    const playersRepository = this.client.globalDb.collection<GlobalPlayersEntity>('global_players');
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
            leagueId: player.league?.id ?? UnrankedLeagueId,
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
          leagueId: player.league?.id ?? (player.trophies >= 5000 ? LEGEND_LEAGUE_ID : UnrankedLeagueData.id),
          clan: player.clan ? { name: player.clan.name, tag: player.clan.tag } : {}
        }
      },
      {
        upsert: true
      }
    );
  }
}

interface SearchDocument {
  userId?: string;
  guildId?: string;
  alias?: string;
  name: string;
  tag: string;
  id: string;
}

interface RecentSearchDocument {
  userId: string;
  name: string;
  tag: string;
  lastSearched?: number;
}
