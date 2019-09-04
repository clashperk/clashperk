const { Command } = require('discord-akairo');
const Clans = require('../../models/Clans');
const { firestore } = require('../../struct/Database');
const Profile = require('../../models/Profile');
const Settings = require('../../models/Settings');
const Notes = require('../../models/Notes');
const firebase = require('firebase-admin');

class MigrationCommand extends Command {
	constructor() {
		super('migration', {
			aliases: ['m'],
			category: 'util',
			cooldown: 1000,
			ownerOnly: true,
			description: {
				content: 'Pings me!'
			}
		});
	}

	async exec() {
		// await this.settings();
		await this.clans();
		await this.notes();
	}

	async clans() {
		for (const clan of await Clans.findAll()) {
			const user = this.client.users.find(user => user.tag === clan.user);
			await firestore.collection('tracking_clans')
				.doc(`${clan.guild}${clan.tag}`)
				.update({
					guild: clan.guild,
					user: user ? user.id : clan.user,
					tag: clan.tag,
					channel: clan.channel,
					color: clan.color,
					name: clan.name,
					createdAt: clan.createdAt
				}, { merge: true });
			console.log(clan.tag);
		}
	}

	async profile() {
		for (const data of await Profile.findAll()) {
			if (data.tag) {
				await firestore.collection('linked_players')
					.doc(data.user)
					.update({
						[data.guild]: {
							guild: data.guild,
							user: data.user,
							tag: data.tag,
							name: data.name,
							createdAt: data.createdAt
						}
					}, { merge: true });
			}
			if (data.clan_tag) {
				await firestore.collection('linked_clans')
					.doc(data.user)
					.update({
						[data.guild]: {
							guild: data.guild,
							user: data.user,
							tag: data.clan_tag,
							name: data.clan_name,
							createdAt: data.createdAt
						}
					}, { merge: true });
			}
			console.log(JSON.stringify(data));
		}
	}

	async settings() {
		for (const setting of await Settings.findAll()) {
			await firestore.collection('settings').doc(setting.guild).update(setting.settings, { merge: true });
			console.log(setting);
		}
	}

	async notes() {
		console.log(await Notes.findAll());
		for (const note of await Notes.findAll()) {
			await firestore.collection('player_notes').doc(`${note.guild}${note.tag}`)
				.update({
					note: note.note,
					guild: note.guild,
					user: note.user,
					tag: note.tag,
					createdAt: note.createdAt
				}, { merge: true });
			console.log(note);
		}
	}
}

module.exports = MigrationCommand;
