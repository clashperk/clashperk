import { Op, COLLECTIONS } from '../util/Constants';
import { Message } from 'discord.js';
import { ObjectId } from 'mongodb';
import Client from './Client';

export interface ClanStore {
	_id: ObjectId;
	flag: number;
	name: string;
	tag: string;
	guild: string;
	patron: boolean;
	active: boolean;
	createdAt: Date;
	verified: boolean;
}

export default class StorageHandler {
	public constructor(private readonly client: Client) {
		this.client = client;
	}

	public async findAll(id: string) {
		return this.client.db.collection<ClanStore>(COLLECTIONS.CLAN_STORES)
			.find({ guild: id })
			.toArray();
	}

	public async register(message: Message, data: any) {
		const collection = await this.client.db.collection<ClanStore>(COLLECTIONS.CLAN_STORES)
			.findOneAndUpdate({ tag: data.tag, guild: data.guild }, {
				$set: {
					tag: data.tag,
					active: true,
					name: data.name,
					verified: true,
					guild: message.guild!.id,
					patron: this.client.patrons.get(message.guild!.id)
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
			case Op.DONATION_LOG:
				await this.client.db.collection(COLLECTIONS.DONATION_LOGS)
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
			case Op.CLAN_MEMBER_LOG:
				await this.client.db.collection(COLLECTIONS.PLAYER_LOGS)
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
			case Op.LAST_ONLINE_LOG:
				await this.client.db.collection(COLLECTIONS.LAST_ONLINE_LOGS)
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
			case Op.CLAN_GAMES_LOG:
				await this.client.db.collection(COLLECTIONS.CLAN_GAMES_LOGS)
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
			case Op.CLAN_EMBED_LOG:
				await this.client.db.collection(COLLECTIONS.CLAN_EMBED_LOGS)
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
			case Op.CLAN_WAR_LOG:
				await this.client.db.collection(COLLECTIONS.CLAN_WARS).deleteOne({ clan_id: new ObjectId(id) });
				await this.client.db.collection(COLLECTIONS.CLAN_WAR_LOGS)
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
		await this.client.db.collection(COLLECTIONS.DONATION_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(COLLECTIONS.PLAYER_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(COLLECTIONS.LAST_ONLINE_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(COLLECTIONS.CLAN_GAMES_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(COLLECTIONS.CLAN_EMBED_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(COLLECTIONS.CLAN_WAR_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(COLLECTIONS.CLAN_WARS)
			.deleteOne({ clan_id: new ObjectId(id) });

		return this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.deleteOne({ _id: new ObjectId(id) });
	}

	public async remove(id: string, data: any) {
		if (data.op === Op.DONATION_LOG) {
			return this.client.db.collection(COLLECTIONS.DONATION_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Op.CLAN_MEMBER_LOG) {
			return this.client.db.collection(COLLECTIONS.PLAYER_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Op.LAST_ONLINE_LOG) {
			return this.client.db.collection(COLLECTIONS.LAST_ONLINE_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Op.CLAN_GAMES_LOG) {
			return this.client.db.collection(COLLECTIONS.CLAN_GAMES_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Op.CLAN_EMBED_LOG) {
			return this.client.db.collection(COLLECTIONS.CLAN_EMBED_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Op.CLAN_WAR_LOG) {
			await this.client.db.collection(COLLECTIONS.CLAN_WARS)
				.deleteOne({ clan_id: new ObjectId(id) });
			return this.client.db.collection(COLLECTIONS.CLAN_WAR_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}
	}

	public async getWarTags(tag: string) {
		const data = await this.client.db.collection(COLLECTIONS.CWL_WAR_TAGS).findOne({ tag });
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

		const data = await this.client.db.collection(COLLECTIONS.CWL_WAR_TAGS).findOne({ tag });
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
		return this.client.db.collection(COLLECTIONS.CWL_WAR_TAGS)
			.updateOne({ tag }, {
				$set: { tag, season: this.seasonID, warTags, rounds },
				$min: { createdAt: new Date() }
			}, { upsert: true });
	}

	private get seasonID() {
		return new Date().toISOString().substring(0, 7);
	}
}
