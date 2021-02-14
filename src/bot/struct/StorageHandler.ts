import { BitField, Collections } from '@clashperk/node';
import { ObjectId, Collection } from 'mongodb';
import { Message } from 'discord.js';
import Client from './Client';

export interface ClanStore {
	_id: ObjectId;
	flag: number;
	name: string;
	tag: string;
	guild: string;
	patron: boolean;
	paused: boolean;
	active: boolean;
	createdAt: Date;
	verified: boolean;
	channels?: string[];
}

export default class StorageHandler {
	public collection: Collection<ClanStore>;

	public constructor(private readonly client: Client) {
		this.collection = client.db.collection(Collections.CLAN_STORES);
	}

	public async findAll(id: string) {
		return this.collection.find({ guild: id }).toArray();
	}

	public async register(message: Message, data: any) {
		const collection = await this.collection.findOneAndUpdate({ tag: data.tag, guild: data.guild }, {
			$set: {
				name: data.name, tag: data.tag,
				paused: false, verified: true, active: true,
				guild: message.guild!.id, patron: this.client.patrons.get(message.guild!.id)
			},
			$bit: {
				flag: { or: Number(data.op) }
			},
			$min: {
				createdAt: new Date()
			}
		}, { upsert: true, returnOriginal: false });

		const id = collection.value!._id.toHexString();

		switch (data.op) {
			case BitField.DONATION_LOG:
				await this.client.db.collection(Collections.DONATION_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case BitField.CLAN_FEED_LOG:
				await this.client.db.collection(Collections.CLAN_FEED_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							role: data.role
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case BitField.LAST_SEEN_LOG:
				await this.client.db.collection(Collections.LAST_SEEN_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case BitField.CLAN_GAMES_LOG:
				await this.client.db.collection(Collections.CLAN_GAMES_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case BitField.CLAN_EMBED_LOG:
				await this.client.db.collection(Collections.CLAN_EMBED_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							embed: data.embed
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case BitField.CLAN_WAR_LOG:
				await this.client.db.collection(Collections.CLAN_WAR_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			default:
				break;
		}

		return id;
	}

	public async delete(id: string) {
		await this.client.db.collection(Collections.DONATION_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.CLAN_FEED_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.LAST_SEEN_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.CLAN_GAMES_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.CLAN_EMBED_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.CLAN_WAR_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		return this.client.db.collection(Collections.CLAN_STORES)
			.deleteOne({ _id: new ObjectId(id) });
	}

	public async remove(id: string, data: any) {
		if (data.op === BitField.DONATION_LOG) {
			return this.client.db.collection(Collections.DONATION_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === BitField.CLAN_FEED_LOG) {
			return this.client.db.collection(Collections.CLAN_FEED_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === BitField.LAST_SEEN_LOG) {
			return this.client.db.collection(Collections.LAST_SEEN_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === BitField.CLAN_GAMES_LOG) {
			return this.client.db.collection(Collections.CLAN_GAMES_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === BitField.CLAN_EMBED_LOG) {
			return this.client.db.collection(Collections.CLAN_EMBED_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === BitField.CLAN_WAR_LOG) {
			return this.client.db.collection(Collections.CLAN_WAR_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}
	}

	public async getWarTags(tag: string) {
		const data = await this.client.db.collection(Collections.CWL_WAR_TAGS).findOne({ tag });
		if (data?.warTags?.length !== 7) return null;

		if (
			(new Date().getMonth() === new Date(data?.season).getMonth()) ||
			(new Date(data?.season).getMonth() === (new Date().getMonth() - 1) && new Date().getDate() <= 8)
		) return data;

		return Promise.resolve(null);
	}

	public async pushWarTags(tag: string, rounds: any[]) {
		rounds = rounds.filter(r => !r.warTags.includes('#0'));
		if (rounds.length !== 7) return null;

		const data = await this.client.db.collection(Collections.CWL_WAR_TAGS).findOne({ tag });
		if (data?.season === this.seasonID) return null;
		if (data && new Date().getMonth() <= new Date(data.season).getMonth()) return null;

		const warTags = [];
		for (const round of rounds) {
			for (const warTag of round.warTags) {
				const data = await this.client.http.clanWarLeagueWar(warTag);
				if ((data.clan && data.clan.tag === tag) || (data.opponent && data.opponent.tag === tag)) {
					warTags.push(warTag);
					break;
				}
			}
		}

		return this.pushToDB(tag, warTags, rounds);
	}

	private pushToDB(tag: string, warTags: any[], rounds: any[]) {
		return this.client.db.collection(Collections.CWL_WAR_TAGS)
			.updateOne({ tag }, {
				$set: { tag, season: this.seasonID, warTags, rounds },
				$min: { createdAt: new Date() }
			}, { upsert: true });
	}

	private get seasonID() {
		return new Date().toISOString().substring(0, 7);
	}
}
