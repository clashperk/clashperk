import { ObjectId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import Client from './Client.js';

export class ImportLinks {
	public constructor(private readonly client: Client) {
		this.client = client;
	}

	public async init() {
		const cursor = this.client.db.collection(Collections.PLAYER_LINKS).find({ username: null });
		let count = 0;
		while (await cursor.hasNext()) {
			count++;
			const data = await cursor.next();
			if (!data) continue;
			const user = await this.client.users.fetch(data.userId).catch(() => null);
			if (!user) continue;

			await this.client.db
				.collection(Collections.PLAYER_LINKS)
				.updateOne({ _id: new ObjectId(data._id) }, { $set: { username: user.tag } });
			console.log(`[${count}] Updated ${data.tag as string} accounts for ${data.username as string}`);
		}
		console.log('Done');
	}
}
