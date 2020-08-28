const MaintenanceHandler = require('./MaintenanceHandler');
const { mongodb } = require('../struct/Database');
const LastOnlineLog = require('./LastOnlineLog');
const ClanMemberLog = require('./ClanMemberLog');
const ClanEmbedLog = require('./ClanEmbedLog');
const ClanGamesLog = require('./ClanGamesLog');
const DonationLog = require('./DonationLog');
const { Op } = require('../util/constants');
const ClanWarLog = require('./ClanWarLog');
const { ObjectId } = require('mongodb');

class CacheHandler {
	constructor(client) {
		this.client = client;

		this.clanWarLog = new ClanWarLog(client);
		this.donationLog = new DonationLog(client);
		this.clanEmbedLog = new ClanEmbedLog(client);
		this.clanGamesLog = new ClanGamesLog(client);
		this.lastOnlineLog = new LastOnlineLog(client);
		this.clanMemberLog = new ClanMemberLog(client);
		this.maintenanceHandler = new MaintenanceHandler(client);
		this.maintenanceHandler.init();
	}

	async broadcast() {
		const call = await this.client.grpc.broadcast({ shardId: this.client.shard.ids[0], shards: this.client.shard.count });
		call.on('data', async chunk => {
			const data = JSON.parse(chunk.data);
			switch (data.op) {
				case Op.DONATION_LOG:
					await this.donationLog.exec(data.tag, data);
					break;
				case Op.LAST_ONLINE_LOG:
					await this.lastOnlineLog.exec(data.tag, data.clan, data.members);
					break;
				case Op.CLAN_MEMBER_LOG:
					await this.clanMemberLog.exec(data.tag, data);
					break;
				case Op.CLAN_EMBED_LOG:
					await this.clanEmbedLog.exec(data.tag, data.clan);
					break;
				case Op.CLAN_GAMES_LOG:
					await this.clanGamesLog.exec(data.tag, data.clan, data.updated);
					break;
				case Op.CLAN_WAR_LOG:
					await this.clanWarLog.exec(data.tag, data.clan);
					break;
				default:
					break;
			}
		});

		call.on('end', () => {
			this.client.logger.warn('Server Disconnected', { label: 'GRPC' });
		});

		call.on('error', error => {
			this.client.logger.warn(error.toString(), { label: 'GRPC' });
		});

		return Promise.resolve(0);
	}

	async init() {
		await this.clanEmbedLog.init();
		await this.donationLog.init();
		await this.clanMemberLog.init();
		await this.lastOnlineLog.init();
		await this.clanGamesLog.init();
		this.clanWarLog.init();

		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find({ active: true })
			.sort({ patron: -1 })
			.toArray();

		await new Promise(resolve => {
			this.client.grpc.initCacheHandler({
				data: JSON.stringify(collection.filter(data => this.client.guilds.cache.has(data.guild)))
			}, (err, res) => resolve(res.data));
		});

		await this.broadcast();
		return new Promise(resolve => {
			this.client.grpc.init({ shardId: this.client.shard.ids[0], shards: this.client.shard.count }, (err, res) => resolve(res.data));
		});
	}

	async add(Id, data) {
		const id = ObjectId(Id).toString();
		const OP = {
			[Op.DONATION_LOG]: this.donationLog,
			[Op.CLAN_MEMBER_LOG]: this.clanMemberLog,
			[Op.LAST_ONLINE_LOG]: this.lastOnlineLog,
			[Op.CLAN_EMBED_LOG]: this.clanEmbedLog,
			[Op.CLAN_GAMES_LOG]: this.clanGamesLog,
			[Op.CLAN_WAR_LOG]: this.clanWarLog
		};
		if (data?.op) {
			await OP[data.op].add(id);
		} else {
			await Promise.all([...Object.values(OP).map(Op => Op.add(id))]);
		}

		const patron = this.client.patron.get(data?.guild, 'guild', false);
		return this.client.grpc.add({
			data: JSON.stringify({ tag: data?.tag, patron: Boolean(patron), op: data?.op })
		}, () => { });
	}

	delete(Id, data) {
		const id = ObjectId(Id).toString();
		const OP = {
			[Op.DONATION_LOG]: this.donationLog,
			[Op.CLAN_MEMBER_LOG]: this.clanMemberLog,
			[Op.LAST_ONLINE_LOG]: this.lastOnlineLog,
			[Op.CLAN_EMBED_LOG]: this.clanEmbedLog,
			[Op.CLAN_GAMES_LOG]: this.clanGamesLog,
			[Op.CLAN_WAR_LOG]: this.clanWarLog
		};
		if (data?.op) {
			OP[data.op].delete(id);
		} else {
			Object.values(OP).map(Op => Op.delete(id));
		}

		return this.client.grpc.delete({
			data: JSON.stringify({ tag: data?.tag, op: data?.op })
		}, () => { });
	}

	async flush() {
		this.clanWarLog.clear();
		this.donationLog.cached.clear();
		this.clanGamesLog.cached.clear();
		this.clanEmbedLog.cached.clear();
		this.clanMemberLog.cached.clear();
		this.lastOnlineLog.cached.clear();

		this.members = {};
		return this.client.grpc.flush({}, () => { });
	}
}

module.exports = CacheHandler;
