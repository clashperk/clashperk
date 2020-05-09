const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');

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
						retry: 'Please provide a valid PlayerTag.'
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const deleted = await this.delete(message.author.id, data.tag);
		if (!deleted) {
			return message.util.send({
				embed: {
					color: 3093046,
					description: `Couldn\'t find a player linked to **${message.author.tag}**!`
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
			.findOneAndUpdate({ user: id }, { $pull: { tags: tag } });
		return data.value && data.value.tags && data.value.tags.includes(tag);
	}
}

module.exports = UnlinkCommand;
