const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { ObjectId } = require('mongodb');

class ToggleCommand extends Command {
	constructor() {
		super('toggle', {
			aliases: ['toggle', 'stop'],
			category: 'activity',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Toogle logs and boards on your guild.',
				usage: '<method> <tag>',
				examples: ['donationlog #8QU8J9LP', 'playerlog #8QU8J9LP', 'lastonline #8QU8J9LP']
			},
			args: [
				{
					id: 'method',
					type: [
						['DONATION_LOG', 'donationlog'],
						['PLAYER_LOG', 'playerlog'],
						['LAST_ONLINE_LOG', 'lastonline', 'lastonlineboard'],
						['CLAN_EMBED_LOG', 'clanembed'],
						['CLAN_GAMES_LOG', 'clangames', 'clangame', 'clangamesboard', 'clangameboard', 'cgboard']
					],
					prompt: {
						start: 'What would you like to stop?'
					}
				},
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
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { method, tag }) {
		if (!method) {
			const prefix = this.handler.prefix(message);
			const embed = this.client.util.embed()
				.setAuthor('No Method Selected')
				.setDescription([
					'**Available Methods**',
					'• donationlog `<clanTag>`',
					'• playerlog `<clanTag>`',
					'• lastonline `<clanTag>`',
					'• clanembed <clanTag>',
					'• clangames <clanTag>',
					'',
					'**Examples**',
					`\`${prefix}stop donationlog #8QU8J9LP\``,
					`\`${prefix}stop playerlog #8QU8J9LP\``,
					`\`${prefix}stop lastonline #8QU8J9LP\``,
					`\`${prefix}stop clanembed #8QU8J9LP\``,
					`\`${prefix}stop clangames #8QU8J9LP\``
				]);
			return message.util.send({ embed });
		}

		const db = mongodb.db('clashperk');
		const data = await db.collection('clanstores')
			.findOne({ tag: tag.toUpperCase(), guild: message.guild.id });

		if (!data) {
			return message.util.send({
				embed: {
					description: 'ClanTag Not Found.'
				}
			});
		}

		const id = ObjectId(data._id).toString();

		await this.client.storage.stop(data._id, { mode: method });
		await this.client.cacheHandler.delete(id, { mode: method });
		await this.delete(id);

		return message.util.send({
			embed: {
				title: `Successfully deleted **${data.name} (${data.tag})**`,
				color: 5861569
			}
		});
	}

	async delete(id) {
		const db = mongodb.db('clashperk');
		const data = await Promise.all([
			db.collection('donationlogs').findOne({ clan_id: ObjectId(id) }),
			db.collection('playerlogs').findOne({ clan_id: ObjectId(id) }),
			db.collection('lastonlinelogs').findOne({ clan_id: ObjectId(id) }),
			db.collection('clanembedlogs').findOne({ clan_id: ObjectId(id) })
		]).then(collection => collection.every(item => item == null));
		if (data) {
			this.client.cacheHandler.delete(id);
			return db.collection('clanstores').deleteOne({ _id: ObjectId(id) });
		}
	}
}

module.exports = ToggleCommand;
