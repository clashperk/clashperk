import { Collections, BitField } from '@clashperk/node';
import MaintenanceHandler from './Maintenance';
import ClanEmbedLog from './ClanEmbedLog';
import ClanGamesLog from './ClanGamesLog';
import LastSeenLog from './LastSeenLog';
import ClanFeedLog from './ClanFeedLog';
import DonationLog from './DonationLog';
import ClanWarLog from './ClanWarLog';
import Client from '../struct/Client';
import Queue from '../struct/Queue';

export default class RPCHandler {
	private paused = Boolean(false);

	private readonly queue = new Queue();

	private readonly maintenance: MaintenanceHandler;

	private readonly clanWarLog = new ClanWarLog(this.client);

	private readonly donationLog = new DonationLog(this.client);

	private readonly clanEmbedLog = new ClanEmbedLog(this.client);

	private readonly clanGamesLog = new ClanGamesLog(this.client);

	private readonly lastOnlineLog = new LastSeenLog(this.client);

	private readonly clanMemberLog = new ClanFeedLog(this.client);

	public constructor(private readonly client: Client) {
		this.maintenance = new MaintenanceHandler(this.client);
		this.maintenance.init();

		this.paused = Boolean(false);
	}

	public pause(forced = false, ms = 5 * 60 * 1000) {
		if (this.paused) return this.paused;
		this.paused = Boolean(true);
		if (forced) setTimeout(() => this.paused = Boolean(false), ms);
		return this.paused;
	}

	private async broadcast() {
		const call = await this.client.rpc.broadcast({ shardId: this.client.shard!.ids[0], shards: this.client.shard!.count });
		call.on('data', async (chunk: any) => {
			const data = JSON.parse(chunk.data);
			// Freeze for 5 min
			if (this.paused) return;

			await this.queue.wait();
			try {
				switch (data.op) {
					case BitField.DONATION_LOG:
						await this.donationLog.exec(data.tag, data);
						break;
					case BitField.LAST_SEEN_LOG:
						await this.lastOnlineLog.exec(data.tag, data.clan, data.members);
						break;
					case BitField.CLAN_FEED_LOG:
						await this.clanMemberLog.exec(data.tag, data);
						break;
					case BitField.CLAN_EMBED_LOG:
						await this.clanEmbedLog.exec(data.tag, data.clan);
						break;
					case BitField.CLAN_GAMES_LOG:
						await this.clanGamesLog.exec(data.tag, data.clan, data.updated);
						break;
					case BitField.CLAN_WAR_LOG:
						await this.clanWarLog.exec(data.clan.tag, data);
						break;
					default:
						break;
				}
			} finally {
				this.queue.shift();
			}
		});

		call.on('end', () => {
			this.client.logger.warn('Server Disconnected', { label: 'GRPC' });
		});

		call.on('error', (error: any) => {
			this.client.logger.warn(error.toString(), { label: 'GRPC' });
		});

		return Promise.resolve(0);
	}

	public async init() {
		await this.clanEmbedLog.init();
		await this.donationLog.init();
		await this.clanMemberLog.init();
		await this.lastOnlineLog.init();
		await this.clanGamesLog.init();
		await this.clanWarLog.init();

		const collection = await this.client.db.collection(Collections.CLAN_STORES)
			.find({
				paused: false, active: true, flag: { $gt: 0 },
				guild: { $in: this.client.guilds.cache.map(guild => guild.id) }
			})
			.toArray();
		const sorted = collection.map(data => ({ data, rand: Math.random() }))
			.sort((a, b) => a.rand - b.rand)
			.map(col => col.data);

		await new Promise(resolve => {
			this.client.rpc.loadClans({
				data: JSON.stringify(sorted)
			}, (err: any, res: any) => resolve(res.data));
		});

		await this.broadcast();
		return new Promise(resolve => this.client.rpc.init({
			shardId: this.client.shard!.ids[0],
			shards: this.client.shard!.count
		}, (err: any, res: any) => resolve(res.data)));
	}

	public async add(id: string, data: { tag: string; guild: string; op: number }) {
		const OP: { [key: string]: any } = {
			[BitField.DONATION_LOG]: this.donationLog,
			[BitField.CLAN_FEED_LOG]: this.clanMemberLog,
			[BitField.LAST_SEEN_LOG]: this.lastOnlineLog,
			[BitField.CLAN_EMBED_LOG]: this.clanEmbedLog,
			[BitField.CLAN_GAMES_LOG]: this.clanGamesLog,
			[BitField.CLAN_WAR_LOG]: this.clanWarLog
		};

		if (data.op.toString() in OP) {
			await OP[data.op].add(id);
		} else {
			Object.values(OP).map(Op => Op.add(id));
		}

		const patron = this.client.patrons.get(data.guild);
		return this.client.rpc.add({ data: JSON.stringify({ tag: data.tag, patron: Boolean(patron), op: data.op }) }, () => null);
	}

	public delete(id: string, data: { tag: string; op: number }) {
		const OP: { [key: string]: any } = {
			[BitField.DONATION_LOG]: this.donationLog,
			[BitField.CLAN_FEED_LOG]: this.clanMemberLog,
			[BitField.LAST_SEEN_LOG]: this.lastOnlineLog,
			[BitField.CLAN_EMBED_LOG]: this.clanEmbedLog,
			[BitField.CLAN_GAMES_LOG]: this.clanGamesLog,
			[BitField.CLAN_WAR_LOG]: this.clanWarLog
		};

		if (data.op.toString() in OP) {
			OP[data.op].delete(id);
		} else {
			Object.values(OP).map(Op => Op.delete(id));
		}

		return this.client.rpc.remove({ data: JSON.stringify({ tag: data.tag, op: data.op }) }, () => null);
	}

	public flush() {
		this.clanWarLog.cached.clear();
		this.donationLog.cached.clear();
		this.clanGamesLog.cached.clear();
		this.clanEmbedLog.cached.clear();
		this.clanMemberLog.cached.clear();
		this.lastOnlineLog.cached.clear();
		return this.client.rpc.flush({ shardId: this.client.shard!.ids[0], shards: this.client.shard!.count }, () => null);
	}
}
