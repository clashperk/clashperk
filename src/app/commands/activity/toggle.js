const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { ObjectId } = require('mongodb');
const { Modes } = require('../../util/constants');

class StopCommand extends Command {
	constructor() {
		super('toggle', {
			aliases: ['stop', 'toggle'],
			category: 'setup',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Stop logs and boards in your guild.',
					'',
					'**Available Methods**',
					'• donationlog `<clanTag>`',
					'• clanlog `<clanTag>`',
					'• lastonline `<clanTag>`',
					'• clangames `<clanTag>`',
					'• clanmebed `<clanTag>`',
					'• all `<clanTag>` - remove all logs and boards for a clan.',
					'',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <clanTag>',
				examples: [
					'donationlog #8QU8J9LP',
					'clanlog #8QU8J9LP',
					'lastonline #8QU8J9LP',
					'clanembed #8QU8J9LP',
					'clangames #8QU8J9LP',
					'all #8QU8J9LP'
				]
			},
			args: [
				{
					id: 'method',
					match: 'phrase',
					type: [
						['all'],
						[Modes.DONATION_LOG, 'donationlog', 'dl'],
						[Modes.CLAN_LOG, 'playerlog', 'clanlog', 'pl'],
						[Modes.ACTIVITY_LOG, 'lastonline', 'lastonlineboard', 'ob'],
						[Modes.CLAN_EMBED_LOG, 'clanembed', 'ce'],
						[Modes.CLAN_GAMES_LOG, 'clangames', 'clangame', 'clangamesboard', 'clangameboard', 'cgboard', 'cg'],
						[Modes.CLAN_WAR_LOG, 'clangames', 'clangame', 'clangamesboard', 'clangameboard', 'cgboard', 'cg']
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
		if (this.client.patron.isPatron(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { method, tag }) {
		if (!method) {
			const prefix = this.handler.prefix(message);
			const embed = this.client.util.embed()
				.setAuthor('No Method Selected')
				.setDescription([
					'Stop Logs and Boards in your guild.',
					'',
					'**Usage**',
					`\`${prefix}stop <method> <clanTag>\``,
					'',
					'**Available Methods**',
					'• donationlog `<clanTag>`',
					'• playerlog `<clanTag>`',
					'• lastonline `<clanTag>`',
					'• clangames `<clanTag>`',
					'• clanmebed `<clanTag>`',
					'• all `<clanTag>` - remove all logs and boards for a clan.',
					'',
					'**Examples**',
					`\`${prefix}stop donationlog #8QU8J9LP\``,
					`\`${prefix}stop playerlog #8QU8J9LP\``,
					`\`${prefix}stop lastonline #8QU8J9LP\``,
					`\`${prefix}stop clanembed #8QU8J9LP\``,
					`\`${prefix}stop clangames #8QU8J9LP\``,
					`\`${prefix}stop all #8QU8J9LP\``
				]);
			return message.util.send({ embed });
		}

		if (method === 'all') {
			return this.handler.handleDirectCommand(message, tag, this.handler.modules.get('remove'), false);
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
		this.delete(id);

		return message.util.send({
			embed: {
				title: `Successfully disabled **${data.name} (${data.tag})**`
			}
		});
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
		]).then(collection => collection.every(item => item == null));
		if (data) {
			this.client.cacheHandler.delete(id);
			return db.collection('clanstores').deleteOne({ _id: ObjectId(id) });
		}
	}
}

module.exports = StopCommand;
