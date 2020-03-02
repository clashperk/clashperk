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
		await firestore.collection('linked_clans')
			.doc(member.id)
			.update({
				[message.guild.id]: {
					guild: message.guild.id,
					user: member.id,
					tag: data.tag,
					name: data.name,
					createdAt: new Date()
				}
			}, { merge: true });

		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x10ffc1)
			.addField(`Linked **${member.user.tag}** to ${data.name} (${data.tag})`, [
				'You\'ve successfully linked. Now enjoy arguments free commands!',
				'',
				'Examples',
				`\`${prefix}clan\`, \`${prefix}myclan\`, \`${prefix}warlog\`, \`${prefix}thcompo\`, \`${prefix}currentwar\`, \`${prefix}roster\`,`,
				`\`${prefix}cwlwar <user>\`, \`${prefix}clan <user>\`, \`${prefix}warlog <user>\`, \`etc\``
			])
			.setThumbnail(member.user.displayAvatarURL());
		return message.util.send({ embed });
	}
}

module.exports = LinkClanCommand;
