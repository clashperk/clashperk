const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');
const firebase = require('firebase-admin');

class UnlinkCommand extends Command {
	constructor() {
		super('unlink', {
			aliases: ['unlink'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'EMBED_LINKS'],
			description: {
				content: 'Unlinks your profile or clan.',
				usage: '<profile/clan>',
				examples: ['profile', 'clan']
			},
			args: [
				{
					id: 'type',
					type: ['profile', 'clan'],
					prompt: {
						start: 'what would you like to unlnk? (`profile` or `clan`)',
						retry: 'please provide a valid input (`profile` or `clan`).'
					}
				},
				{
					id: 'member',
					type: 'member',
					default: message => message.member
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { type, member }) {
		if (type === 'profile') {
			const deleted = await this.delPlayer(message, member);
			if (!deleted) return message.util.reply(`couldn\'t find a player linked to ${member.user.tag}`);
		}

		if (type === 'clan') {
			const deleted = await this.delClan(message, member);
			if (!deleted) return message.util.reply(`couldn\'t find a clan linked to ${member.user.tag}`);
		}

		return message.util.send(`successfully unlinked your ${type}`);
	}

	async delPlayer(message, member) {
		const batch = firestore.batch();
		const deleted = await firestore.collection('linked_players')
			.doc(member.id)
			.get()
			.then(snap => {
				const data = snap.data();
				if (data && data[message.guild.id]) {
					batch.update(snap.ref, {
						[message.guild.id]: firebase.firestore.FieldValue.delete()
					}, { merge: true });
					batch.commit();
					return true;
				}
				return false;
			});
		return deleted;
	}

	async delClan(message, member) {
		const batch = firestore.batch();
		const deleted = await firestore.collection('linked_clans')
			.doc(member.id)
			.get()
			.then(snap => {
				const data = snap.data();
				if (data && data[message.guild.id]) {
					batch.update(snap.ref, {
						[message.guild.id]: firebase.firestore.FieldValue.delete()
					}, { merge: true });
					batch.commit();
					return true;
				}
				return false;
			});
		return deleted;
	}
}
module.exports = UnlinkCommand;
