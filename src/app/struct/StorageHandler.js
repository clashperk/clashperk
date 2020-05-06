const { mongodb } = require('./Database');
const { ObjectId } = require('mongodb');

class StorageHandler {
	constructor(client) {
		this.client = client;
	}

	async register(data) {
		const collection = await mongodb.db('clashperk').collection('clanstores')
			.findOneAndUpdate({ tag: data.tag, guild: data.guild }, {
				$set: {
					tag: data.tag,
					guild: data.guild,
					name: data.name,
					verified: true,
					createdAt: new Date()
				}
			}, { upsert: true, returnOriginal: false });

		const id = ObjectId(collection.value._id).toString();

		switch (data.mode) {
			case 'DONATION_LOG':
				await mongodb.db('clashperk').collection('donationlogs')
					.updateOne({ clan_id: ObjectId(id) }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							patron: data.patron,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case 'PLAYER_LOG':
				await mongodb.db('clashperk').collection('playerlogs')
					.updateOne({ clan_id: ObjectId(id) }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							patron: data.patron,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case 'LAST_ONLINE_LOG':
				await mongodb.db('clashperk').collection('lastonlinelogs')
					.updateOne({ clan_id: ObjectId(id) }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							patron: data.patron,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case 'CLAN_GAMES_LOG':
				await mongodb.db('clashperk').collection('clangameslogs')
					.updateOne({ clan_id: ObjectId(id) }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							patron: data.patron,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case 'CLAN_EMBED_LOG':
				await mongodb.db('clashperk').collection('clanembedlogs')
					.updateOne({ clan_id: ObjectId(id) }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							patron: data.patron,
							embed: data.embed,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			default:
				break;
		}

		return collection.value._id;
	}

	async delete(id) {
		await mongodb.db('clashperk').collection('donationlogs')
			.deleteOne({ clan_id: ObjectId(id) });

		await mongodb.db('clashperk').collection('playerlogs')
			.deleteOne({ clan_id: ObjectId(id) });

		await mongodb.db('clashperk').collection('lastonlinelogs')
			.deleteOne({ clan_id: ObjectId(id) });

		await mongodb.db('clashperk').collection('clangameslogs')
			.deleteOne({ clan_id: ObjectId(id) });

		await mongodb.db('clashperk').collection('clanembedlogs')
			.deleteOne({ clan_id: ObjectId(id) });

		return mongodb.db('clashperk').collection('clanstore')
			.deleteOne({ _id: ObjectId(id) });
	}

	async stop(id, data) {
		if (data.mode === 'DONATION_LOG') {
			return mongodb.db('clashperk').collection('donationlogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.mode === 'PLAYER_LOG') {
			return mongodb.db('clashperk').collection('playerlogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.mode === 'LAST_ONLINE_LOG') {
			return mongodb.db('clashperk').collection('lastonlinelogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.mode === 'CLAN_GAMES_LOG') {
			return mongodb.db('clashperk').collection('clangameslogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.mode === 'CLAN_EMBED_LOG') {
			return mongodb.db('clashperk').collection('clanembedlogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}
	}
}

module.exports = StorageHandler;
