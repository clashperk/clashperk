const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { ObjectId } = require('mongodb');

class RemoveClanCommand extends Command {
	constructor() {
		super('remove', {
			aliases: ['remove', 'remove-clan'],
			category: 'hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Removes a clan from the server.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			args: [
				{
					id: 'tag',
					type: 'string',
					prompt: {
						start: 'What is the clan tag?'
					},
					default: ''
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { tag }) {
		const data = await mongodb.db('clashperk')
			.collection('clanstores')
			.findOne({ guild: message.guild.id, tag: `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` });

		if (!data) {
			return message.util.send({
				embed: {
					description: 'ClanTag Not Found.'
				}
			});
		}

		const id = ObjectId(data._id).toString();
		await this.client.storage.delete(id);
		await this.client.cacheHandler.delete(id, { tag: data.tag });

		return message.util.send({
			embed: {
				title: `Successfully deleted **${data.name} (${data.tag})**`
			}
		});
	}
}

module.exports = RemoveClanCommand;
