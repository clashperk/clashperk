import { Collections, Flags } from '../util/Constants.js';
import { Client } from '../struct/Client.js';
import Queue from '../struct/Queue.js';
import MaintenanceHandler from './Maintenance.js';
import { RoleManager } from './RoleManager.js';
import ClanEmbedLog from './ClanEmbedLog.js';
import ClanGamesLog from './ClanGamesLog.js';
import LastSeenLog from './LastSeenLog.js';
import ClanFeedLog from './ClanFeedLog.js';
import DonationLog from './DonationLog.js';
import ClanWarLog from './ClanWarLog.js';

export default class RPCHandler {
	private paused = Boolean(false);
	private readonly queue = new Queue();
	private readonly api: MaintenanceHandler;
	private readonly clanWarLog = new ClanWarLog(this.client);
	private readonly donationLog = new DonationLog(this.client);
	private readonly clanEmbedLog = new ClanEmbedLog(this.client);
	private readonly clanGamesLog = new ClanGamesLog(this.client);
	private readonly lastSeenLog = new LastSeenLog(this.client);
	private readonly clanFeedLog = new ClanFeedLog(this.client);

	public roleManager = new RoleManager(this.client);

	public constructor(private readonly client: Client) {
		this.api = new MaintenanceHandler(this.client);
		this.api.init();
		this.paused = Boolean(false);
	}

	public pause(forced = false, ms = 5 * 60 * 1000) {
		if (this.paused) return this.paused;
		this.paused = Boolean(true);
		if (forced) setTimeout(() => (this.paused = Boolean(false)), ms);
		return this.paused;
	}

	private async broadcast() {
		await this.client.subscriber.subscribe('channel', async (message) => {
			const data = JSON.parse(message);

			if (this.paused) return;
			if (this.queue.remaining >= 2000) return;

			await this.queue.wait();
			try {
				switch (data.op) {
					case Flags.DONATION_LOG:
						await this.donationLog.exec(data.tag, data);
						break;
					case Flags.LAST_SEEN_LOG:
						await this.lastSeenLog.exec(data.tag, data);
						break;
					case Flags.CLAN_FEED_LOG:
						await Promise.allSettled([this.clanFeedLog.exec(data.tag, data), this.roleManager.exec(data.tag, data)]);
						break;
					case Flags.CLAN_EMBED_LOG:
						await this.clanEmbedLog.exec(data.tag, data);
						break;
					case Flags.CLAN_GAMES_LOG:
						await this.clanGamesLog.exec(data.tag, data);
						break;
					case Flags.CLAN_WAR_LOG:
						await this.clanWarLog.exec(data.clan.tag, data);
						break;
					default:
						break;
				}
			} catch (e) {
				console.error(e);
			} finally {
				this.queue.shift();
			}
		});

		return this.client.publisher.publish(
			'CONNECT',
			JSON.stringify({ shardId: this.client.shard!.ids[0], shards: this.client.shard!.count })
		);
	}

	public async init() {
		if (this.api.isMaintenance) return;

		await this.clanEmbedLog.init();
		await this.donationLog.init();
		await this.clanFeedLog.init();
		await this.lastSeenLog.init();
		await this.clanGamesLog.init();
		await this.clanWarLog.init();

		await this.broadcast();
		return this.client.publisher.publish('INIT', '{}');
	}

	public async add(id: string, data: { tag: string; guild: string; op: number }) {
		if (!this.client.guilds.cache.has(data.guild)) return;
		const result = await this.client.db
			.collection(Collections.CLAN_STORES)
			.aggregate<{ tag: string; patron: boolean; flags: number[]; lastRan?: string }>([
				{
					$match: {
						tag: data.tag,
						active: true,
						paused: false
					}
				},
				{
					$group: {
						_id: '$tag',
						patron: {
							$addToSet: '$patron'
						},
						flags: {
							$addToSet: '$flag'
						},
						lastRan: {
							$max: '$lastRan'
						}
					}
				},
				{
					$set: {
						tag: '$_id',
						patron: {
							$in: [true, '$patron']
						}
					}
				},
				{
					$unset: '_id'
				}
			])
			.next();

		const OP = {
			[Flags.DONATION_LOG]: this.donationLog,
			[Flags.CLAN_FEED_LOG]: this.clanFeedLog,
			[Flags.LAST_SEEN_LOG]: this.lastSeenLog,
			[Flags.CLAN_EMBED_LOG]: this.clanEmbedLog,
			[Flags.CLAN_GAMES_LOG]: this.clanGamesLog,
			[Flags.CLAN_WAR_LOG]: this.clanWarLog
		};

		if (data.op.toString() in OP) {
			await OP[data.op].add(id);
		} else {
			Object.values(OP).map((Op) => Op.add(id));
		}

		if (result) {
			const clan = {
				tag: result.tag,
				patron: result.patron,
				flag: this.bitWiseOR(result.flags),
				lastRan: result.lastRan
			};
			await this.client.publisher.publish('ADD', JSON.stringify({ ...clan, op: data.op }));
		}
	}

	public async delete(id: string, data: { tag: string; op: number; guild: string }) {
		const clans = await this.client.db
			.collection(Collections.CLAN_STORES)
			.find({ tag: data.tag, active: true, paused: false, guild: { $ne: data.guild } }, { projection: { _id: 1 } })
			.toArray();

		const OP = {
			[Flags.DONATION_LOG]: this.donationLog,
			[Flags.CLAN_FEED_LOG]: this.clanFeedLog,
			[Flags.LAST_SEEN_LOG]: this.lastSeenLog,
			[Flags.CLAN_EMBED_LOG]: this.clanEmbedLog,
			[Flags.CLAN_GAMES_LOG]: this.clanGamesLog,
			[Flags.CLAN_WAR_LOG]: this.clanWarLog
		};

		if (data.op.toString() in OP) {
			OP[data.op].delete(id);
		} else {
			Object.values(OP).map((Op) => Op.delete(id));
		}

		if (!clans.length) await this.client.publisher.publish('REMOVE', JSON.stringify(data));
	}

	private bitWiseOR(flags: number[]) {
		return flags.reduce((acc, curr) => acc | curr, 0);
	}

	public async flush() {
		this.clanWarLog.cached.clear();
		this.donationLog.cached.clear();
		this.clanGamesLog.cached.clear();
		this.clanEmbedLog.cached.clear();
		this.clanFeedLog.cached.clear();
		this.lastSeenLog.cached.clear();

		await this.client.subscriber.unsubscribe('channel');
		return this.client.publisher.publish('FLUSH', '{}');
	}
}
