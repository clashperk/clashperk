const { firebase } = require('../struct/Database');

class Clans {
	static async create(tag, name, guild, channel, color, user, createdAt = new Date()) {
		const prev = await firebase.ref('clans')
			.child(`${guild}@${tag.replace(/#/g, '')}`)
			.once('value')
			.then(snap => snap.val());
		if (prev) {
			return this.update(tag, name, guild, channel, color, user, new Date());
		}
		return firebase.ref('clans').child(`${guild}@${tag.replace(/#/g, '')}`).update({ tag, name, guild, channel, color, user, createdAt });
	}

	static update(tag, name, guild, channel, color, user, updatedAt = new Date()) {
		return firebase.ref('clans').child(`${guild}@${tag.replace(/#/g, '')}`).update({ tag, name, guild, channel, color, user, updatedAt });
	}

	static destroy(guild, tag) {
		return firebase.ref('clans').child(`${guild}@${tag.replace(/#/g, '')}`).remove();
	}

	static async findAll(guild) {
		if (guild) {
			const object = await firebase.ref('clans')
				.orderByChild('guild')
				.equalTo(guild)
				.once('value')
				.then(snap => snap.val());
			return this.values(object);
		}
		const object = await firebase.ref('clans').once('value').then(snap => snap.val());
		return this.values(object);
	}

	static async findOne(guild, tag) {
		return firebase.ref('clans').child(`${guild}${tag}`)
			.once('value')
			.then(snap => snap.val());
	}

	static values(object) {
		if (!object) return Object.values({});
		return Object.values(object);
	}
}

module.exports = Clans;
