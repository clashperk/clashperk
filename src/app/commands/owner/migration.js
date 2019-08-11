const { Command } = require('discord-akairo');
const { firebase } = require('../../struct/Database');
const Clans = require('../../models/Clans');
const Profile = require('../../models/Profile');
const Settings = require('../../models/Settings');
const Notes = require('../../models/Notes');

class MigrationCommand extends Command {
	constructor() {
		super('migration', {
			aliases: ['migration'],
			category: 'owner',
			ownerOnly: true,
			quoted: false,
			description: {
				content: 'You can\'t use this anyway, so why explain?',
				usage: '[type] <module>'
			}
		});
	}

	async exec(message) {
		/* const clans = await firebase.ref('clans').once('value').then(snap => snap.val());
		for (const data of this.values(clans)) {
			await Clans.create({
				guild: data.guild, channel: data.channel, tag: data.tag, name: data.name,
				color: isNaN(data.color) ? Number(5861569) : Number(data.color), createdAt: data.createdAt,
				updatedAt: data.updatedAt, tracking: data.tracking, user: data.user
			});
		}

		const profile = await firebase.ref('profile').once('value').then(snap => snap.val());

		for (const value of Object.values(profile)) {
			for (const data of Object.values(value)) {
				console.log(data);
				await Profile.create({
					user: data.user, guild: data.guild,
					clan_name: data.clan_name ? data.clan_name : null, clan_tag: data.clan_tag ? data.clan_tag : null,
					tag: data.tag ? data.tag : null, name: data.name ? data.name : null
				});
			}
		}

		const settings = await firebase.ref('settings').once('value').then(snap => snap.val());
		for (const [key, value] of Object.entries(settings)) {
			await Settings.upsert({
				guild: key,
				settings: value
			});
		}
		await console.log(JSON.stringify(await Settings.findAll()));*/

		const notes = await firebase.ref('notes').once('value').then(snap => snap.val());
		for (const value of Object.values(notes)) {
			for (const data of Object.values(value)) {
				console.log(data);
				await Notes.create({
					createdAt: data.createdAt, updatedAt: data.updatedAt,
					guild: data.guild,
					note: data.note,
					tag: data.tag,
					user: data.user
				});
			}
		}
	}

	values(object) {
		if (!object) return Object.values({});
		return Object.values(object);
	}
}

module.exports = MigrationCommand;
