import { Client } from './client.js';

export class ElasticIndexer {
  public constructor(private readonly client: Client) {}

  public async upsert(doc: SearchDocument, index: string) {
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

  public insert(doc: SearchDocument, index: string) {
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
