import { COLLECTIONS } from '../util/Constants';
import Client from './Client';
import qs from 'querystring';
import https from 'https';

const [apiKey, pageId, metricId] = [process.env.API_KEY!, process.env.PAGE_ID!, process.env.METRIC_ID!];

export default class StatsHandler {
	public postRate: number;
	public count: number;
	public messages = new Map<string, NodeJS.Timeout>();

	public constructor(private readonly client: Client, { postRate = 2.5 * 60 * 1000 } = {}) {
		this.postRate = postRate;
		this.count = 0;
	}

	private get ISTDate() {
		return new Date(Date.now() + 198e5).toISOString().substring(0, 10);
	}

	public async init() {
		await this.stats();
		this.client.setInterval(this.stats.bind(this), this.postRate);
	}

	public counter() {
		return this.count += 1;
	}

	public async post() {
		let guilds = 0;
		const values = await this.client.shard!.broadcastEval(
			`[
				this.guilds.cache.size
			]`
		);

		for (const value of values) {
			guilds += value[0];
		}

		// https://top.gg/
		const form = qs.stringify({ server_count: guilds, shard_count: this.client.shard!.count });
		https.request(`https://top.gg/api/bots/${this.client.user!.id}/stats`, {
			method: 'POST', headers: {
				'Authorization': process.env.DBL!,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': form.length
			}
		}, res => {
			res.on('data', d => {
				if (res.statusCode !== 200) {
					this.client.logger.error(d.toString(), { label: 'https://top.gg' });
				}
			});
		}).end(form);
	}

	public message(id: string) {
		if (this.messages.has(id)) return null;
		this.messages.set(id, setTimeout(() => this.messages.delete(id), 60 * 60 * 1000));

		return this.client.db.collection(COLLECTIONS.BOT_GUILDS)
			.updateOne(
				{ guild: id },
				{
					$max: { updatedAt: new Date() },
					$min: { createdAt: new Date() },
					$inc: { usage: 0 }
				},
				{ upsert: true }
			);
	}

	public historic() {
		return this.client.db.collection(COLLECTIONS.BOT_USAGE)
			.updateOne({ ISTDate: this.ISTDate }, {
				$inc: {
					usage: 1
				},
				$set: {
					ISTDate: this.ISTDate
				},
				$min: {
					createdAt: new Date()
				}
			}, { upsert: true });
	}

	public async commands(command: string) {
		await this.client.db.collection(COLLECTIONS.BOT_STATS)
			.updateOne({ id: 'stats' }, {
				$set: { id: 'stats' },
				$inc: {
					commands_used: 1,
					[`commands.${command}`]: 1
				}
			}, { upsert: true });

		return this.historic();
	}

	public deletion() {
		return this.client.db.collection(COLLECTIONS.BOT_GROWTH)
			.updateOne({ ISTDate: this.ISTDate }, {
				$inc: {
					addition: 0,
					deletion: 1,
					retention: 0
				},
				$set: {
					ISTDate: this.ISTDate
				},
				$min: {
					createdAt: new Date()
				}
			}, { upsert: true });
	}

	public async addition(guild: string) {
		const old = await this.client.db.collection(COLLECTIONS.BOT_GUILDS)
			.countDocuments({ guild });

		return this.client.db.collection(COLLECTIONS.BOT_GROWTH)
			.updateOne({ ISTDate: this.ISTDate }, {
				$inc: {
					addition: 1,
					deletion: 0,
					retention: old ? 1 : 0
				},
				$set: {
					ISTDate: this.ISTDate
				},
				$min: {
					createdAt: new Date()
				},
				$max: {
					updatedAt: new Date()
				}
			}, { upsert: true });
	}

	public users(user: string) {
		return this.client.db.collection(COLLECTIONS.BOT_USERS)
			.updateOne({ user }, {
				$set: { user },
				$inc: { usage: 1 },
				$min: { createdAt: new Date() }
			}, { upsert: true });
	}

	public guilds(guild: string, count = 1) {
		return this.client.db.collection('botguilds')
			.updateOne({ guild }, {
				$set: { guild },
				$inc: { usage: count },
				$max: { updatedAt: new Date() },
				$min: { createdAt: new Date() }
			}, { upsert: true });
	}

	public stats() {
		if (this.client.user!.id !== '526971716711350273') return;
		const data = {
			timestamp: Math.floor(new Date().getTime() / 1000),
			value: this.count
		};

		try {
			https.request(`https://api.statuspage.io/v1/pages/${pageId}/metrics/${metricId}/data.json`, {
				method: 'POST', headers: { Authorization: `OAuth ${apiKey}` }
			}, res => {
				res.on('data', d => {
					if (res.statusCode !== 201) {
						this.client.logger.warn(d.toString(), { label: 'STATUS_PAGE' });
					}
				});
				res.on('end', () => {
					this.count = 0;
				});
			}).end(JSON.stringify({ data }));
		} catch (error) {
			this.client.logger.error(error, { label: 'STATUS_PAGE' });
		}

		return Promise.resolve();
	}
}
