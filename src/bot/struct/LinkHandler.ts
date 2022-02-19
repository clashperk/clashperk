import { User } from 'discord.js';
import { Collection } from 'mongodb';
import { UserInfo } from '../types';
import { Collections } from '../util/Constants';
import Client from './Client';

export default class LinkHandler {
	protected collection: Collection<UserInfo>;

	public constructor(private readonly client: Client) {
		this.collection = this.client.db.collection(Collections.LINKED_PLAYERS);
	}

	public async linkPlayers(data: { name: string; tag: string; townHallLevel: number }, user: User, unshift: boolean) {
		await this.collection.updateOne({ user: user.id }, {
			$set: {
				user: user.id,
				user_tag: user.tag,
				createdAt: new Date()
			},
			$push: unshift
				? {
					entries: {
						$each: [
							{
								tag: data.tag, name: data.name, unknown: false,
								verified: await this.isVerified(user, data.tag)
							}
						],
						$position: 0
					}
				}
				: {
					entries: { tag: data.tag, name: data.name, verified: false, unknown: false }
				}
		}, { upsert: true });
	}

	private async isVerified(user: User, tag: string) {
		const data = await this.collection.findOne({ user: user.id });
		return data?.entries.find(en => en.tag === tag && en.verified) ? true : false;
	}

	public async getPlayers(user: User) {
		const data = await this.collection.findOne({ user: user.id });
		const others = await this.client.http.getPlayerTags(user.id);

		const playerTagSet = new Set([
			...(data?.entries ?? []).map(en => en.tag),
			...others.map(tag => tag)
		]);

		return (await Promise.all(Array.from(playerTagSet).slice(0, 25).map(tag => this.client.http.player(tag))))
			.filter(res => res.ok);
	}
}
