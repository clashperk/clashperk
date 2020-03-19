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
				content: 'Unlinks your profile form your Discord.',
				usage: '<tag>',
				examples: ['#9Q92C8R20']
			},
			args: [
				{
					id: 'data',
					type: 'player',
					prompt: {
						start: 'What tag would you like to unlink?',
						retry: 'Please provide a valid tag to unlink.'
					}
				},
				{
					id: 'member',
					type: 'guildMember',
					default: message => message.member
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data, member }) {
		const deleted = await this.delete(member.id, data.tag);
		if (!deleted) {
			return message.util.send({
				embed: {
					color: 3093046,
					description: `Couldn\'t find a player linked to **${member.user.tag}**!`
				}
			});
		}

		const embed = this.client.util.embed()
			.setColor(0x10ffc1)
			.setAuthor(`Successfully deleted **${data.name} (${data.tag})**`);
		return message.util.send({ embed });
	}

	async delete(id, tag) {
		const batch = firestore.batch();
		const deleted = await firestore.collection('linked_accounts')
			.doc(id, tag)
			.get()
			.then(snap => {
				const data = snap.data();
				if (data && data.tags.length && data.tags.includes(tag)) {
					batch.update(snap.ref, {
						tags: firebase.firestore.FieldValue.arrayRemove(tag),
						[`metadata.${tag}`]: firebase.firestore.FieldValue.delete()
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
