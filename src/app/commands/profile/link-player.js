const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

class LinkPlayerCommand extends Command {
	constructor() {
		super('link-player', {
			aliases: ['link-player', 'link-profile', 'save-profile'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: 'Saves a player to your discord account.',
				usage: '<tag> [member]',
				examples: ['#9Q92C8R20', '#9Q92C8R20 Suvajit']
			},
			args: [
				{
					id: 'data',
					type: 'player',
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
		await firestore.collection('linked_players')
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
				'You\'ve successfully linked.',
				`You can link multiple accounts, to view your all accounts type **${prefix}profile**`,
				'',
				'If you don\'t provide the tag for other lookup comamnds, the Bot will use the last one you linked.',
				`For Examples **${prefix}player** will return the info ${data.name} (${data.tag}).`,
				`As well as **${prefix}units** will return the player units for the same profile.`,
				`Mentioning a user in discord works too \`${prefix}player <user>\`, \`${prefix}units <user>\``
			])
			.setThumbnail(member.user.displayAvatarURL());
		return message.util.send({ embed });
	}
}

module.exports = LinkPlayerCommand;
