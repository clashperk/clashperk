import { COLLECTIONS } from '../util/Constants';
import Client from './Client';
import qs from 'querystring';
import https from 'https';
import Interaction from './Interaction';

export default class StatsHandler {
	public messages = new Map<string, NodeJS.Timeout>();
	private readonly client: Client;

	public constructor(client: Client) {
		this.client = client;
	}

	private get ISTDate() {
		return new Date(Date.now() + 198e5).toISOString().substring(0, 10);
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

	public async interactions(interaction: Interaction, command: string) {
		await this.client.db.collection(COLLECTIONS.BOT_INTERACTIONS)
			.updateOne({ user: interaction.author.id }, {
				$inc: {
					usage: 1
				},
				$set: {
					guild: interaction.guild.id
				}
			}, { upsert: true });

		return this.client.db.collection(COLLECTIONS.BOT_STATS)
			.updateOne({ id: 'stats' }, {
				$inc: {
					[`interactions.${command}`]: 1
				}
			}, { upsert: true });
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
		return this.client.db.collection(COLLECTIONS.BOT_GUILDS)
			.updateOne({ guild }, {
				$set: { guild },
				$inc: { usage: count },
				$max: { updatedAt: new Date() },
				$min: { createdAt: new Date() }
			}, { upsert: true });
	}
}
