const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { ObjectId } = require('mongodb');

class RemoveClanCommand extends Command {
	constructor() {
		super('remove', {
			aliases: ['remove', 'remove-clan'],
			category: 'setup',
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
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { tag }) {
		const db = mongodb.db('clashperk');
		const clan = await db.collection('clanstores')
			.findOne({ guild: message.guild.id, tag: tag.toUpperCase() });

		if (!clan) {
			return message.util.send({
				embed: {
					description: 'ClanTag Not Found.'
				}
			});
		}

		const id = ObjectId(clan._id).toString();
		await this.client.storage.delete(id);
		await this.client.cacheHandler.delete(id);

		return message.util.send({
			embed: {
				title: `Successfully deleted **${clan.name} (${clan.tag})**`,
				color: 5861569
			}
		});
	}
}

module.exports = RemoveClanCommand;
