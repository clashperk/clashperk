const { firebase } = require('../struct/Database');

class Notes {
	static create(guild, user, tag, note, createdAt = new Date()) {
		return firebase.ref('notes')
			.child(guild)
			.child(tag.replace(/#/g, '@'))
			.update({ guild, user, tag, note, createdAt });
	}

	static async destroy(guild, tag) {
		const object = await firebase.ref('notes')
			.child(guild)
			.child(tag.replace(/#/g, '@'));

		const data = await object.once('value').then(snap => snap.val());
		await object.remove();
		return data;
	}

	static async findOne(guild, tag) {
		return firebase.ref('notes')
			.child(guild)
			.child(tag.replace(/#/g, '@'))
			.once('value')
			.then(snap => snap.val());
	}
}

module.exports = Notes;
