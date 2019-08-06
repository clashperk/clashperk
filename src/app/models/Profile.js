const { firebase } = require('../struct/Database');

class Profile {
	static async create(guild, user, data, option) {
		if (option === 'clan') {
			return firebase.ref('profile')
				.child(guild)
				.child(user)
				.update({ guild, user, clan_tag: data.tag, clan_name: data.name });
		}

		if (option === 'profile') {
			return firebase.ref('profile')
				.child(guild)
				.child(user)
				.update({ guild, user, tag: data.tag, name: data.name });
		}
	}

	static async destroy(guild, user, option) {
		const object = await firebase.ref('profile')
			.child(guild)
			.child(user);
		const data = await object.once('value').then(snap => snap.val());

		if (option === 'clan') {
			await object.update({ clan_name: null, clan_tag: null });
		}
		if (option === 'profile') {
			await object.update({ tag: null, name: null });
		}

		return data;
	}

	static async findOne(guild, user) {
		return firebase.ref('profile')
			.child(guild)
			.child(user)
			.once('value')
			.then(snap => snap.val());
	}
}
module.exports = Profile;
