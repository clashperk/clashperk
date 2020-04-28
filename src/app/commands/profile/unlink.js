const { Command } = require('discord-akairo');
const { firestore, mongodb } = require('../../struct/Database');
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
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
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
			.setAuthor(`Successfully deleted ${data.tag}`);
		return message.util.send({ embed });
	}

	async delete(id, tag) {
		const data = await mongodb.db('clashperk')
			.collection('linkedusers')
			.findOneAndUpdate({ user: id }, {
				$pull: { tags: tag }
			});
		return data.value && data.value.tags && data.value.tags.includes(tag);
	}
}

module.exports = UnlinkCommand;
