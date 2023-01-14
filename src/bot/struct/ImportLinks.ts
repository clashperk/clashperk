import { ObjectId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import Client from './Client.js';

export class ImportLinks {
	public constructor(private readonly client: Client) {
		this.client = client;
	}

	public async init() {
		const cursor = this.client.db.collection(Collections.PLAYER_LINKS).find({ name: null });
		let count = 0;
		while (await cursor.hasNext()) {
			count++;
			const data = await cursor.next();
			if (!data) continue;
			const player = await this.client.http.player(data.tag);
			if (!player.ok) continue;

			await this.client.db
				.collection(Collections.PLAYER_LINKS)
				.updateOne({ _id: new ObjectId(data._id) }, { $set: { name: player.name } });
			console.log(`[${count}] Updated ${data.tag as string} accounts for ${data.username as string}`);
		}
		console.log('Done');
	}
}
