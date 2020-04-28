const { Command } = require('discord-akairo');
const { firestore, mongodb } = require('../../struct/Database');
const firebase = require('firebase-admin');

class UnlinkClanCommand extends Command {
	constructor() {
		super('unlinkclan', {
			aliases: ['unlinkclan'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'EMBED_LINKS'],
			description: {
				content: 'Unlinks your clan from your Discord.',
				usage: '<tag>',
				examples: ['#8QU8J9LP']
			},
			args: [
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

	async exec(message, { member }) {
		const deleted = await this.remove(member.id);
		if (!deleted) {
			return message.util.send({
				embed: {
					color: 3093046,
					description: `Couldn\'t find a clan linked to **${member.user.tag}**!`
				}
			});
		}

		const embed = this.client.util.embed()
			.setColor(0x10ffc1)
			.setAuthor(`Successfully deleted ${deleted}`);
		return message.util.send({ embed });
	}

	async remove(id) {
		const data = await mongodb.db('clashperk')
			.collection('linkedusers')
			.deleteOne({ user: id });
		console.log(data);
		return data;
	}
}

module.exports = UnlinkClanCommand;
