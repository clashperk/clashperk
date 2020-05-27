const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');

class LinkClanCommand extends Command {
	constructor() {
		super('link-clan', {
			aliases: ['link-clan', 'save-clan'],
			category: 'hidden',
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
						start: 'What is your ClanTag?',
						retry: (msg, { failure }) => failure.value
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
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data, member }) {
		await mongodb.db('clashperk').collection('linkedclans')
			.updateOne({ user: member.id }, {
				$set: {
					user: member.id,
					tag: data.tag,
					createdAt: new Date(),
					hidden: false
				}
			}, { upsert: true });

		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setDescription([
				`Linked **${member.user.tag}** to **${data.name}** (${data.tag})`,
				'',
				'If you don\'t provide the tag for other lookup comamnds, the Bot will use the last one you linked.',
				`For Examples **\u200b${prefix}clan** will return the info of *${data.name} (${data.tag})*.`,
				`As well as **\u200b${prefix}thcompo** will return the townhall composition for the same clan (works with other comamnds too).`
			]);
		return message.util.send({ embed });
	}
}

module.exports = LinkClanCommand;
