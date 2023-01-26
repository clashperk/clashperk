import { ObjectId } from 'mongodb';
import { PlayerLinks } from '../types/index.js';
import { Collections, ElasticIndex } from '../util/Constants.js';
import Client from './Client.js';

export class Indexer {
	public constructor(private readonly client: Client) {}

	public init() {
		this.client.logger.debug('Indexer initialized', { label: 'Indexer' });

		this.client.db
			.collection<PlayerLinks>(Collections.PLAYER_LINKS)
			.watch(
				[
					{
						$match: { operationType: { $in: ['insert', 'update', 'delete'] } }
					}
				],
				{ fullDocument: 'updateLookup' }
			)
			.on('change', (change) => {
				if (['insert'].includes(change.operationType)) {
					const link = change.fullDocument!;
					return this.upsert(
						{ id: link._id!.toHexString(), userId: link.userId, name: link.name, tag: link.tag },
						ElasticIndex.USER_LINKED_PLAYERS
					);
				}

				if (['update'].includes(change.operationType) && change.updateDescription?.updatedFields.name) {
					const link = change.fullDocument!;
					return this.upsert(
						{ id: link._id!.toHexString(), userId: link.userId, name: link.name, tag: link.tag },
						ElasticIndex.USER_LINKED_PLAYERS
					);
				}

				if (['delete'].includes(change.operationType)) {
					const id: string = change.documentKey!._id.toHexString();
					return this.delete(id, ElasticIndex.USER_LINKED_PLAYERS);
				}
			});

		this.client.db
			.collection<{ _id: ObjectId; name: string; tag: string; alias: string; guild: string }>(Collections.CLAN_STORES)
			.watch(
				[
					{
						$match: { operationType: { $in: ['insert', 'update', 'delete'] } }
					}
				],
				{ fullDocument: 'updateLookup' }
			)
			.on('change', (change) => {
				if (['insert'].includes(change.operationType)) {
					const clan = change.fullDocument!;
					return this.upsert(
						{
							id: clan._id.toHexString(),
							name: clan.name,
							tag: clan.tag,
							guildId: clan.guild,
							alias: clan.alias
						},
						ElasticIndex.GUILD_LINKED_CLANS
					);
				}

				if (['update'].includes(change.operationType) && change.updateDescription?.updatedFields.name) {
					const clan = change.fullDocument!;
					return this.upsert(
						{
							id: clan._id.toHexString(),
							name: clan.name,
							tag: clan.tag,
							guildId: clan.guild,
							alias: clan.alias
						},
						ElasticIndex.GUILD_LINKED_CLANS
					);
				}

				if (['delete'].includes(change.operationType)) {
					const id: string = change.documentKey!._id.toHexString();
					return this.delete(id, ElasticIndex.GUILD_LINKED_CLANS);
				}
			});

		this.client.db
			.collection<{ _id: ObjectId; clan: { name: string; tag: string }; userId: string }>(Collections.USERS)
			.watch(
				[
					{
						$match: { operationType: { $in: ['insert', 'update', 'delete'] } }
					}
				],
				{ fullDocument: 'updateLookup' }
			)
			.on('change', (change) => {
				if (['insert'].includes(change.operationType)) {
					const user = change.fullDocument!;
					return this.upsert(
						{
							id: user._id.toHexString(),
							name: user.clan.name,
							tag: user.clan.tag,
							userId: user.userId
						},
						ElasticIndex.USER_LINKED_CLANS
					);
				}

				if (['update'].includes(change.operationType)) {
					const user = change.fullDocument!;
					return this.upsert(
						{
							id: user._id.toHexString(),
							name: user.clan.name,
							tag: user.clan.tag,
							userId: user.userId
						},
						ElasticIndex.USER_LINKED_CLANS
					);
				}

				if (['delete'].includes(change.operationType)) {
					const id: string = change.documentKey!._id.toHexString();
					return this.delete(id, ElasticIndex.USER_LINKED_CLANS);
				}
			});
	}

	public async upsert(doc: SearchDocument, index: string) {
		const result = await this.client.elastic.search<SearchDocument>({
			index,
			query: { match: { id: doc.id } }
		});
		for (const hit of result.hits.hits) {
			const { _id } = hit;
			await this.client.elastic.delete({ index, id: _id });
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
			const { _id } = hit;
			await this.client.elastic.delete({ index, refresh: true, id: _id });
		}
	}

	public async index(doc: RecentSearchDocument, index: string) {
		try {
			const result = await this.client.elastic.get({ index, id: doc.tag });
			if (result.found) {
				await this.client.elastic.update({
					index,
					refresh: true,
					id: doc.tag,
					doc: { lastSearched: Date.now() }
				});
			}
		} catch (error) {
			await this.client.elastic.index({
				index,
				refresh: true,
				id: doc.tag,
				document: { ...doc, lastSearched: Date.now() }
			});
		}
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
