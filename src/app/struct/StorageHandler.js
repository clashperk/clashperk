const { mongodb } = require('./Database');
const { ObjectId } = require('mongodb');
const { Op } = require('../util/constants');

class StorageHandler {
	constructor(client) {
		this.client = client;
	}

	async register(message, data) {
		const collection = await mongodb.db('clashperk').collection('clanstores')
			.findOneAndUpdate({ tag: data.tag, guild: data.guild }, {
				$set: {
					tag: data.tag,
					guild: data.guild,
					name: data.name,
					verified: true,
					patron: this.client.patron.get(message.guild.id, 'guild', false),
					active: true,
					createdAt: new Date()
				}
			}, { upsert: true, returnOriginal: false });

		const id = ObjectId(collection.value._id).toString();

		switch (data.op) {
			case Op.DONATION_LOG:
				await mongodb.db('clashperk').collection('donationlogs')
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Op.CLAN_MEMBER_LOG:
				await mongodb.db('clashperk').collection('playerlogs')
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							role: data.role,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Op.LAST_ONLINE_LOG:
				await mongodb.db('clashperk').collection('lastonlinelogs')
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Op.CLAN_GAMES_LOG:
				await mongodb.db('clashperk').collection('clangameslogs')
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Op.CLAN_EMBED_LOG:
				await mongodb.db('clashperk').collection('clanembedlogs')
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							embed: data.embed,
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Op.CLAN_WAR_LOG:
				await mongodb.db('clashperk').collection('clanwars').deleteOne({ clan_id: ObjectId(id) });
				await mongodb.db('clashperk').collection('clanwarlogs')
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
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

		await mongodb.db('clashperk').collection('clanwarlogs')
			.deleteOne({ clan_id: ObjectId(id) });

		await mongodb.db('clashperk').collection('clanwars')
			.deleteOne({ clan_id: ObjectId(id) });

		return mongodb.db('clashperk').collection('clanstores')
			.deleteOne({ _id: ObjectId(id) });
	}

	async stop(id, data) {
		if (data.op === Op.DONATION_LOG) {
			return mongodb.db('clashperk').collection('donationlogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.op === Op.CLAN_MEMBER_LOG) {
			return mongodb.db('clashperk').collection('playerlogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.op === Op.LAST_ONLINE_LOG) {
			return mongodb.db('clashperk').collection('lastonlinelogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.op === Op.CLAN_GAMES_LOG) {
			return mongodb.db('clashperk').collection('clangameslogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.op === Op.CLAN_EMBED_LOG) {
			return mongodb.db('clashperk').collection('clanembedlogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}

		if (data.op === Op.CLAN_WAR_LOG) {
			await mongodb.db('clashperk').collection('clanwars')
				.deleteOne({ clan_id: ObjectId(id) });
			return mongodb.db('clashperk').collection('clanwarlogs')
				.deleteOne({ clan_id: ObjectId(id) });
		}
	}
}

module.exports = StorageHandler;
