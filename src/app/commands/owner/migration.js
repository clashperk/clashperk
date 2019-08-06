const { Command } = require('discord-akairo');
const Settings = require('../../models/Settings');
const Notes = require('../../models/Notes');
const Profile = require('../../models/Profile');
const Clans = require('../../models/Clans');
const { firebase } = require('../../struct/Database');

class MigrationCommand extends Command {
	constructor() {
		super('migration', {
			aliases: ['migration'],
			category: 'owner',
			ownerOnly: true
		});
	}

	async exec() {
		const setting = await Settings.findAll({});
		for (const { guild, settings } of setting) {
			await firebase.ref('settings').child(guild).update(settings);
		}

		const clans = await Clans.findAll({});
		for (const clan of clans) {
			console.log(JSON.stringify(clan));
			await firebase.ref('clans').child(`${clan.guild}${clan.tag.replace(/#/g, '@')}`).update(JSON.parse(JSON.stringify(clan)));
		}

		const cs = await Profile.findAll({});
		for (const clan of cs) {
			console.log(JSON.stringify(clan));
			await firebase.ref('profile').child(`${clan.guild}/${clan.user}`).update(JSON.parse(JSON.stringify(clan)));
		}

		const notes = await Notes.findAll({});
		for (const clan of notes) {
			console.log(JSON.stringify(clan));
			await firebase.ref('notes').child(`${clan.guild}/${clan.tag.replace(/#/g, '@')}`).update(JSON.parse(JSON.stringify(clan)));
		}
	}
}

module.exports = MigrationCommand;
