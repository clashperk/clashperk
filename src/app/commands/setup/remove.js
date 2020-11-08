const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { ObjectId } = require('mongodb');
const { Op } = require('../../util/constants');

const logType = {
	0: 'Donation Log',
	1: 'Clan Feed',
	2: 'Last Online Board',
	3: 'Clan Embed',
	4: 'Clan Games Board',
	5: 'Clan War Log'
};

class StopCommand extends Command {
	constructor() {
		super('stop', {
			aliases: ['remove', 'stop', 'toggle', 'delete', 'disable'],
			category: 'setup',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Removes logs and boards from your server.',
					'',
					'**Available Methods**',
					'• `all <clanTag>`',
					'• `clan-feed <clanTag>`',
					'• `clangames <clanTag>`',
					'• `clan-wars <clanTag>`',
					'• `clanembed <clanTag>`',
					'• `donations <clanTag>`',
					'• `lastonline <clanTag>`',
					'',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <clanTag>',
				examples: [
					'all #8QU8J9LP',
					'clan-feed #8QU8J9LP',
					'clangames #8QU8J9LP',
					'clanembed #8QU8J9LP',
					'clan-wars #8QU8J9LP',
					'donations #8QU8J9LP',
					'lastonline #8QU8J9LP'
				]
			},
			args: [
				{
					id: 'method',
					match: 'phrase',
					type: [
						['all'],
						[Op.DONATION_LOG.toString(), 'donationlog', 'donations'],
						[Op.CLAN_MEMBER_LOG.toString(), 'memberlog', 'clan-feed'],
						[Op.LAST_ONLINE_LOG.toString(), 'onlineboard', 'lastonline'],
						[Op.CLAN_EMBED_LOG.toString(), 'clanembed'],
						[Op.CLAN_GAMES_LOG.toString(), 'gameboard', 'clangames'],
						[Op.CLAN_WAR_LOG.toString(), 'clanwarlog', 'clan-wars']
					],
					default: ''
				},
				{
					id: 'tag',
					type: 'string',
					default: ''
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { method, tag }) {
		if (!method) {
			const prefix = this.handler.prefix(message);
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor('No Method Selected')
				.setDescription([
					'Stop Logs and Live Boards in your server.',
					'',
					'**Usage**',
					`\`${prefix}stop <method> <clanTag>\``,
					'',
					'**Available Methods**',
					'• `all <clanTag>`',
					'• `clan-feed <clanTag>`',
					'• `clan-wars <clanTag>`',
					'• `clangames <clanTag>`',
					'• `clanembed <clanTag>`',
					'• `donations <clanTag>`',
					'• `lastonline <clanTag>`',
					'',
					'**Examples**',
					`\`${prefix}remove all #8QU8J9LP\``,
					`\`${prefix}remove clan-feed #8QU8J9LP\``,
					`\`${prefix}remove clangames #8QU8J9LP\``,
					`\`${prefix}remove clanembed #8QU8J9LP\``,
					`\`${prefix}remove donations #8QU8J9LP\``,
					`\`${prefix}remove clan-wars #8QU8J9LP\``,
					`\`${prefix}remove lastonline #8QU8J9LP\``
				]);
			return message.util.send({ embed });
		}

		const data = await mongodb.db('clashperk')
			.collection('clanstores')
			.findOne({ tag: `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}`, guild: message.guild.id });

		if (!data) {
			return message.util.send({
				embed: {
					description: 'I could not find this clan in this server!'
				}
			});
		}

		const id = ObjectId(data._id).toString();
		if (method === 'all') {
			await this.client.storage.delete(id);
			await this.client.cacheHandler.delete(id, { tag: data.tag });
			return message.util.send({ embed: { title: `Successfully deleted **${data.name} (${data.tag})**` } });
		}

		await this.client.storage.stop(data._id, { op: Number(method) });
		await this.client.cacheHandler.delete(id, { op: Number(method), tag: data.tag });
		this.delete(id);
		return message.util.send({ embed: { description: `Successfully removed ${logType[method]} for **${data.name} (${data.tag})**` } });
	}

	async delete(id) {
		const db = mongodb.db('clashperk');
		const data = await Promise.all([
			db.collection('donationlogs').findOne({ clan_id: ObjectId(id) }),
			db.collection('playerlogs').findOne({ clan_id: ObjectId(id) }),
			db.collection('lastonlinelogs').findOne({ clan_id: ObjectId(id) }),
			db.collection('clanembedlogs').findOne({ clan_id: ObjectId(id) }),
			db.collection('clangameslogs').findOne({ clan_id: ObjectId(id) }),
			db.collection('clanwarlogs').findOne({ clan_id: ObjectId(id) })
		]).then(collection => collection.every(item => item == null)); // eslint-disable-line no-eq-null
		if (data) {
			this.client.cacheHandler.delete(id);
			return db.collection('clanstores').updateOne({ _id: ObjectId(id) }, { $set: { active: false } });
		}
	}
}

module.exports = StopCommand;
