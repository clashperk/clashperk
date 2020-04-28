const { mongodb } = require('./Database');

class StorageHandler {
	constructor(client) {
		this.client = client;
		this.database = mongodb.db('clashperk');
	}

	async linkProfile(data) {
		return this.database.collection('linkedaccounts')
			.updateOne({
				tag: data.tag
			}, {
				$set: {
					tag: data.tag,
					user: data.user
				}
			}, { upsert: true });
	}

	async linkClan(data) {
		return this.database.collection('linkedclans')
			.updateOne({ tag: data.tag }, {
				$set: {
					tag: data.tag,
					user: data.user
				}
			}, { upsert: true });
	}

	getProfile(tag) {
		return this.database.collection('linkedaccounts').find({ tag });
	}

	getClan(tag) {
		return this.database.collection('linkedclans').findOne({ tag });
	}

	registerClan(data) {
		return this.database.collection('linkedclans')
			.findOneAndUpdate({ tag: data.tag, guild: data.guild }, {
				tag: data.tag,
				guild: data.guild,
				name: data.name
			}, { upsert: true, returnOriginal: false });
	}
}

module.exports = StorageHandler;
