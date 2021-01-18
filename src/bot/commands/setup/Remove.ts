import { Command, PrefixSupplier } from 'discord-akairo';
import { COLLECTIONS, Op } from '../../util/Constants';
import { Message } from 'discord.js';
import { ObjectId } from 'mongodb';

const logType: { [key: string]: string } = {
	[Op.DONATION_LOG]: 'Donation Log',
	[Op.CLAN_MEMBER_LOG]: 'Clan Feed',
	[Op.LAST_ONLINE_LOG]: 'Last Online Board',
	[Op.CLAN_EMBED_LOG]: 'Clan Embed',
	[Op.CLAN_GAMES_LOG]: 'Clan Games Board',
	[Op.CLAN_WAR_LOG]: 'Clan War Log'
};

export default class StopCommand extends Command {
	public constructor() {
		super('stop', {
			aliases: ['remove', 'stop', 'toggle', 'delete', 'disable'],
			category: 'setup',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Remove clans or logs from the server.',
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
					'id': 'method',
					'match': 'phrase',
					'type': [
						['all'],
						[Op.DONATION_LOG.toString(), 'donationlog', 'donations'],
						[Op.CLAN_MEMBER_LOG.toString(), 'memberlog', 'clan-feed'],
						[Op.LAST_ONLINE_LOG.toString(), 'onlineboard', 'lastonline'],
						[Op.CLAN_EMBED_LOG.toString(), 'clanembed'],
						[Op.CLAN_GAMES_LOG.toString(), 'gameboard', 'clangames'],
						[Op.CLAN_WAR_LOG.toString(), 'clanwarlog', 'clan-wars']
					],
					'default': ''
				},
				{
					'id': 'tag',
					'type': 'string',
					'default': ''
				}
			]
		});
	}

	public async exec(message: Message, { method, tag }: { tag: string; method: string }) {
		if (!method) {
			const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor('No Method Selected')
				.setDescription([
					'Remove clans or logs from the server.',
					'',
					'**Usage**',
					`\`${prefix}remove <method> <clanTag>\``,
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
			return message.util!.send({ embed });
		}

		const data = await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.findOne({ tag: `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}`, guild: message.guild!.id });

		if (!data) {
			return message.util!.send({
				embed: {
					description: 'I could not find this clan in this server!'
				}
			});
		}

		const id = data._id.toHexString();
		if (method === 'all') {
			await this.client.storage.delete(id);
			await this.client.rpcHandler.delete(id, { tag: data.tag, op: 0 });
			return message.util!.send({ embed: { title: `Successfully deleted **${data.name as string} (${data.tag as string})**` } });
		}

		const deleted = await this.client.storage.remove(data._id, { op: Number(method) });
		if (deleted?.deletedCount) await this.bitField(id, Number(method));
		await this.client.rpcHandler.delete(id, { op: Number(method), tag: data.tag });

		await this.delete(id, data.tag);
		return message.util!.send({
			embed: {
				description: `Successfully removed ${logType[method]} for **${data.name as string} (${data.tag as string})**`
			}
		});
	}

	private async delete(id: string, tag: string) {
		const data = await Promise.all([
			this.client.db.collection(COLLECTIONS.DONATION_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(COLLECTIONS.PLAYER_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(COLLECTIONS.LAST_ONLINE_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(COLLECTIONS.CLAN_EMBED_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(COLLECTIONS.CLAN_GAMES_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) }),
			this.client.db.collection(COLLECTIONS.CLAN_WAR_LOGS)
				.countDocuments({ clan_id: new ObjectId(id) })
		]).then(collection => collection.every(num => num === 0));

		if (data) {
			this.client.rpcHandler.delete(id, { tag, op: 0 });
			return this.client.db.collection(COLLECTIONS.CLAN_STORES).updateOne({ _id: new ObjectId(id) }, { $set: { flag: 0 } });
		}
	}

	private bitField(id: string, bit: number) {
		return this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.updateOne({ _id: new ObjectId(id) }, { $bit: { flag: { xor: bit } } });
	}
}
