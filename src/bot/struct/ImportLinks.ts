import { ObjectId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import Client from './Client.js';

export class ImportLinks {
	public constructor(private readonly client: Client) {
		this.client = client;
	}

	public async init() {
		const cursor = this.client.db
			.collection<{
				createdAt?: Date;
				user_tag?: string;
				user: string;
				entries?: { name?: string; tag: string; verified: boolean }[];
			}>(Collections.USERS)
			.find()
			.skip(26778);
		let count = 26778;
		while (await cursor.hasNext()) {
			count++;
			const data = await cursor.next();
			if (!data) continue;
			const accounts = (data.entries ?? []).map((en, i) => ({
				userId: data.user,
				username: data.user_tag,
				name: en.name,
				tag: en.tag,
				order: i,
				verified: en.verified,
				createdAt: data.createdAt ?? new ObjectId(data._id).getTimestamp()
			}));

			// take out the duplicate accounts using reduce
			const uniqueAccounts = accounts.reduce<typeof accounts>((acc, cur) => {
				const x = acc.find((item) => item.tag === cur.tag);
				if (!x) {
					acc.push(cur);
				}
				return acc;
			}, []);

			if (accounts.length) await this.client.db.collection(Collections.PLAYER_LINKS).insertMany(uniqueAccounts);
			console.log(`[${count}] Inserted ${accounts.length} accounts for ${data.user_tag ?? data.user}`);
		}
		console.log('Done');
	}
}
