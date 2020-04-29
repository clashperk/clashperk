const { mongodb } = require('./Database');

class StorageHandler {
	constructor(client) {
		this.client = client;
		this.database = mongodb.db('clashperk');
	}

	async register(data) {
		const collection = await this.database.collection('clanstores')
			.findOneAndUpdate({ tag: data.tag, guild: data.guild }, {
				tag: data.tag,
				guild: data.guild,
				name: data.name,
				createdAt: new Date()
			}, { upsert: true, returnOriginal: false });

		switch (data.type) {
			case 'DONATION_LOG':
				await this.database.collection('donationlogs')
					.updateOne({ clan_id: collection.value._id }, {
						$set: {
							clan_id: collection.value._id,
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
				await this.database.collection('playerlogs')
					.updateOne({ clan_id: collection.value._id }, {
						$set: {
							clan_id: collection.value._id,
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
				await this.database.collection('lastonlinelogs')
					.updateOne({ clan_id: collection.value._id }, {
						$set: {
							clan_id: collection.value._id,
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
				await this.database.collection('clangameslogs')
					.updateOne({ clan_id: collection.value._id }, {
						$set: {
							clan_id: collection.value._id,
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
				await this.database.collection('clanembedlogs')
					.updateOne({ clan_id: collection.value._id }, {
						$set: {
							clan_id: collection.value._id,
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

		return collection;
	}

	async delete(data) {
		await this.database.collection('donationlogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		await this.database.collection('playerlogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		await this.database.collection('lastonlinelogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		await this.database.collection('clangameslogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		await this.database.collection('clanembedlogs')
			.deleteOne({ guild: data.guild, tag: data.tag });

		return this.database.collection('clanstore')
			.deleteOne({ guild: data.guild, tag: data.tag });
	}

	async stop(data) {
		if (data.type === 'DONATION_LOG') {
			return this.database.collection('donationlogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}

		if (data.type === 'PLAYER_LOG') {
			return this.database.collection('playerlogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}

		if (data.type === 'LAST_ONLINE_LOG') {
			return this.database.collection('lastonlinelogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}

		if (data.type === 'CLAN_GAMES_LOG') {
			return this.database.collection('clangameslogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}

		if (data.type === 'CLAN_EMBED_LOG') {
			return this.database.collection('clanembedlogs')
				.deleteOne({ guild: data.guild, tag: data.tag });
		}
	}
}

module.exports = StorageHandler;
