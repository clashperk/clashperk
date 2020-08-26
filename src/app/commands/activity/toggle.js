const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { ObjectId } = require('mongodb');
const { Op } = require('../../util/constants');

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
					'• all `<clanTag>`',
					'• clanlog `<clanTag>`',
					'• cgboard `<clanTag>`',
					'• clanembed `<clanTag>`',
					'• donationlog `<clanTag>`',
					'• onlineboard `<clanTag>`',
					'',
					'For additional `<...args>` usage refer to the examples below.'
				],
				usage: '<method> <clanTag>',
				examples: [
					'all #8QU8J9LP',
					'clanlog #8QU8J9LP',
					'cgboard #8QU8J9LP',
					'clanembed #8QU8J9LP',
					'donationlog #8QU8J9LP',
					'onlineboard #8QU8J9LP'
				]
			},
			args: [
				{
					id: 'method',
					match: 'phrase',
					type: [
						['all'],
						[Op.DONATION_LOG.toString(), 'donationlog', 'dl'],
						[Op.CLAN_MEMBER_LOG.toString(), 'playerlog', 'clanlog', 'cl', 'pl'],
						[Op.LAST_ONLINE_LOG.toString(), 'onlineboard', 'ob'],
						[Op.CLAN_EMBED_LOG.toString(), 'clanembed', 'ce'],
						[Op.CLAN_GAMES_LOG.toString(), 'cgboard', 'cg'],
						[Op.CLAN_WAR_LOG.toString(), 'warlog', 'clanwarlog', 'wl']
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
					'Stop Logs and Boards in your guild.',
					'',
					'**Usage**',
					`\`${prefix}stop <method> <clanTag>\``,
					'',
					'**Available Methods**',
					'• all `<clanTag>`',
					'• clanlog `<clanTag>`',
					'• cgboard `<clanTag>`',
					'• clanembed `<clanTag>`',
					'• donationlog `<clanTag>`',
					'• onlineboard `<clanTag>`',
					'',
					'**Examples**',
					`\`${prefix}stop all #8QU8J9LP\``,
					`\`${prefix}stop clanlog #8QU8J9LP\``,
					`\`${prefix}stop cgboard #8QU8J9LP\``,
					`\`${prefix}stop clanembed #8QU8J9LP\``,
					`\`${prefix}stop donationlog #8QU8J9LP\``,
					`\`${prefix}stop onlineboard #8QU8J9LP\``
				]);
			return message.util.send({ embed });
		}

		if (method === 'all') {
			return this.handler.handleDirectCommand(message, tag, this.handler.modules.get('remove'), false);
		}

		const data = await mongodb.db('clashperk')
			.collection('clanstores')
			.findOne({ tag: `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}`, guild: message.guild.id });

		if (!data) {
			return message.util.send({
				embed: {
					description: 'Clan Not Found.'
				}
			});
		}

		const id = ObjectId(data._id).toString();
		await this.client.storage.stop(data._id, { op: Number(method) });
		await this.client.cacheHandler.delete(id, { op: Number(method), tag: data.tag });
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
		]).then(collection => collection.every(item => item == null)); // eslint-disable-line no-eq-null
		if (data) {
			this.client.cacheHandler.delete(id);
			return db.collection('clanstores').updateOne({ _id: ObjectId(id) }, { $set: { active: false } });
		}
	}
}

module.exports = StopCommand;
