const { mongodb } = require('../struct/Database');

class CacheHandler {
	constructor(client) {
		this.client = client;
	}

	async init() {
		const call = await this.client.grpc.broadcast();
		call.write({ shardId: 0, shards: 1 });
		call.on('data', d => {
			const data = JSON.parse(d.data);
			console.log([data.tag, data.op]);
		});

		const collection1 = await mongodb.db('clashperk')
			.collection('lastonlinelogs')
			.find()
			.toArray();
		await this.client.grpc.initOnlineHandler({ data: JSON.stringify(collection1) }, () => { });

		const collection2 = await mongodb.db('clashperk')
			.collection('clangameslogs')
			.find()
			.toArray();
		await this.client.grpc.initClanGamesHandler({ data: JSON.stringify(collection2) }, () => { });

		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find({ active: true })
			.sort({ patron: -1 })
			.toArray();
		await this.client.grpc.initCacheHandler({ data: JSON.stringify(collection) }, () => { });
		return this.client.grpc.init({ shards: 1 }, () => { });
	}
}

module.exports = CacheHandler;
