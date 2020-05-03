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
					createdAt: new Date()
				}
			}, { upsert: true, returnOriginal: false });

		const id = ObjectId(collection.value._id).toString();

		switch (data.type) {
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
							createdAt: new Date()
						}
					}, { upsert: true });
			default:
				break;
		}

		return collection.value._id;
	}

	async delete(data) {
		await mongodb.db('clashperk').collection('donationlogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		await mongodb.db('clashperk').collection('playerlogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		await mongodb.db('clashperk').collection('lastonlinelogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		await mongodb.db('clashperk').collection('clangameslogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		await mongodb.db('clashperk').collection('clanembedlogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		return mongodb.db('clashperk').collection('clanstore')
			.deleteOne({ guild: data.guild, tag: data.tag });
	}

	async stop(data) {
		if (data.type === 'DONATION_LOG') {
			return mongodb.db('clashperk').collection('donationlogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}

		if (data.type === 'PLAYER_LOG') {
			return mongodb.db('clashperk').collection('playerlogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}

		if (data.type === 'LAST_ONLINE_LOG') {
			return mongodb.db('clashperk').collection('lastonlinelogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}

		if (data.type === 'CLAN_GAMES_LOG') {
			return mongodb.db('clashperk').collection('clangameslogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}

		if (data.type === 'CLAN_EMBED_LOG') {
			return mongodb.db('clashperk').collection('clanembedlogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}
	}
}

module.exports = StorageHandler;
