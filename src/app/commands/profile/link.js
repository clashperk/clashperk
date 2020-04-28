const { Command } = require('discord-akairo');
const { firestore, mongodb } = require('../../struct/Database');
const admin = require('firebase-admin');

class LinkPlayerCommand extends Command {
	constructor() {
		super('link-player', {
			aliases: ['link', 'link-profile', 'save-profile', 'link-player'],
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
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data, member }) {
		const doc = await this.getPlayer(data.tag);
		if (doc && doc.user === member.id) {
			return message.util.send({
				embed: {
					color: 3093046,
					description: `**${member.user.tag}** is already linked to **${data.name} (${data.tag})**`
				}
			});
		}

		if (doc && doc.user !== member.id) {
			return message.util.send({
				embed: {
					color: 3093046,
					description: `**${data.name} (${data.tag})** is already linked to another Discord ID.`
				}
			});
		}

		if (doc && doc.tags.length >= 25) {
			return message.util.send({
				embed: {
					color: 3093046,
					description: 'You can only link 25 accounts to your Discord.'
				}
			});
		}

		await mongodb.db('clashperk').collection('linkedplayers')
			.updateOne({ user: member.id }, {
				$set: {
					user: member.id,
					hidden: false,
					default: false,
					createdAt: new Date()
				},
				$push: { tags: data.tag }
			}, { upsert: true });

		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setDescription([
				`Linked **${member.user.tag}** to **${data.name}** (${data.tag})`,
				'',
				`You can link multiple accounts, to view your all accounts use **\u200b${prefix}profile** command.`,
				'If you don\'t provide the tag for other lookup comamnds, the Bot will use the last one you linked.',
				`For Examples **\u200b${prefix}player** will return the info of *${data.name} (${data.tag})*.`,
				`As well as **\u200b${prefix}units** will return the player units for the same account (works with other comamnds too).`
			]);
		return message.util.send({ embed });
	}

	async getPlayer(tag) {
		return mongodb.db('clashperk').collection('linkedplayers')
			.findOne({ tags: tag });
	}
}

module.exports = LinkPlayerCommand;
