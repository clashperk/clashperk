const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

class LinkClanCommand extends Command {
	constructor() {
		super('link-clan', {
			aliases: ['link-clan', 'save-clan'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: 'Saves a clan to your discord account.',
				usage: '<tag> [member]',
				examples: ['#9Q92C8R20', '#9Q92C8R20 Suvajit']
			},
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'What would you like to search for?',
						retry: (msg, { failure }) => failure.value
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
		const doc = await this.getClan(data.tag, member.id);
		if (doc) {
			await doc.ref.update({ clan: data.tag, createdAt: new Date() });
		} else {
			await firestore.collection('linked_accounts')
				.doc(member.id)
				.update({
					user: member.id,
					clan: data.tag,
					createdAt: new Date(),
					tags: []
				}, { merge: true });
		}

		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x10ffc1)
			.addField(`Linked **${member.user.tag}** to ${data.name} (${data.tag})`, [
				'You\'ve successfully linked.',
				'',
				'If you don\'t provide the tag for other lookup comamnds, the Bot will use the last one you linked.',
				'',
				`For Examples **\u200b${prefix}clan** will return the info of *${data.name} (${data.tag})*.`,
				'',
				`As well as **\u200b${prefix}thcompo** will return the townhall composition for the same clan (works with other comamnds too).`,
				'',
				`Also get info by mention or user-id **\u200b${prefix}clan <user/id>** (works if the user is linked).`
			])
			.setThumbnail(member.user.displayAvatarURL());
		return message.util.send({ embed });
	}

	async getClan(tag, id) {
		let data;
		await firestore.collection('linked_accounts')
			.where('clan', '==', tag)
			.where('user', '==', id)
			.limit(1)
			.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					data = Object.assign({ ref: doc.ref }, doc.data());
				});
				if (!snapshot.size) data = null;
			});
		return data;
	}
}

module.exports = LinkClanCommand;
