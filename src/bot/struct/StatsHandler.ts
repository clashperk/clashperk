import { Collections } from '../util/Constants';
import { Client } from './Client';
import qs from 'querystring';
import https from 'https';
import { User, Guild, Interaction } from 'discord.js';

export default class StatsHandler {
	public messages = new Map<string, NodeJS.Timeout>();

	public constructor(private readonly client: Client) {}

	private get key() {
		return new Date(Date.now() + 198e5).toISOString().substring(0, 10);
	}

	public async post() {
		const values = (await this.client.shard!.fetchClientValues('guilds.cache.size').catch(() => [0])) as number[];
		const guilds = values.reduce((prev, curr) => prev + curr, 0);
		if (!guilds) return;

		const clans = await this.client.db.collection(Collections.CLAN_STORES).estimatedDocumentCount();
		const players = await this.client.db.collection(Collections.LAST_SEEN).estimatedDocumentCount();
		await this.client.db.collection(Collections.BOT_STATS).updateOne({ id: 'stats' }, { $set: { guilds, clans, players } });

		const form = qs.stringify({ server_count: guilds, shard_count: this.client.shard!.count });
		https
			.request(
				`https://top.gg/api/bots/${this.client.user!.id}/stats`,
				{
					method: 'POST',
					headers: {
						'Authorization': process.env.DBL!,
						'Content-Length': form.length,
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				},
				(res) => {
					res.on('data', (d) => {
						if (res.statusCode !== 200) {
							this.client.logger.error(d.toString(), { label: 'https://top.gg' });
						}
					});
				}
			)
			.end(form);
	}

	public async message(id: string) {
		if (this.messages.has(id)) return null;
		this.messages.set(id, setTimeout(() => this.messages.delete(id), 60 * 60 * 1000).unref());

		return this.client.db.collection(Collections.BOT_GUILDS).updateOne(
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
		await this.client.db.collection(Collections.BOT_INTERACTIONS).updateOne(
			{ user: interaction.user.id },
			{
				$inc: {
					usage: 1
				},
				$set: {
					guild: interaction.guild!.id
				}
			},
			{ upsert: true }
		);

		return this.client.db.collection(Collections.BOT_STATS).updateOne(
			{ id: 'stats' },
			{
				$inc: {
					[`interactions.${command}`]: 1
				}
			},
			{ upsert: true }
		);
	}

	public historic(command: string) {
		return this.client.db.collection(Collections.BOT_USAGE).updateOne(
			{ key: this.key },
			{
				$inc: {
					usage: 1,
					[`commands.${command}`]: 1
				},
				$set: {
					key: this.key
				},
				$min: {
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
	}

	public async commands(command: string) {
		await this.client.db.collection(Collections.BOT_STATS).updateOne(
			{ id: 'stats' },
			{
				$inc: {
					commands_used: 1,
					[`commands.${command}`]: 1
				}
			},
			{ upsert: true }
		);

		return this.historic(command);
	}

	public deletion() {
		return this.client.db.collection(Collections.BOT_GROWTH).updateOne(
			{ key: this.key },
			{
				$inc: {
					addition: 0,
					deletion: 1,
					retention: 0
				},
				$set: {
					key: this.key
				},
				$min: {
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
	}

	public async addition(guild: string) {
		const old = await this.client.db.collection(Collections.BOT_GUILDS).countDocuments({ guild });

		return this.client.db.collection(Collections.BOT_GROWTH).updateOne(
			{ key: this.key },
			{
				$inc: {
					addition: 1,
					deletion: 0,
					retention: old ? 1 : 0
				},
				$set: {
					key: this.key
				},
				$min: {
					createdAt: new Date()
				},
				$max: {
					updatedAt: new Date()
				}
			},
			{ upsert: true }
		);
	}

	public users(user: User) {
		return this.client.db.collection(Collections.BOT_USERS).updateOne(
			{ user: user.id },
			{
				$set: { user: user.id, user_tag: user.tag },
				$inc: { usage: 1 },
				$min: { createdAt: new Date() }
			},
			{ upsert: true }
		);
	}

	public guilds(guild: Guild, usage = 1) {
		return this.client.db.collection(Collections.BOT_GUILDS).updateOne(
			{ guild: guild.id },
			{
				$set: { guild: guild.id, name: guild.name },
				$inc: { usage },
				$max: { updatedAt: new Date() },
				$min: { createdAt: new Date() }
			},
			{ upsert: true }
		);
	}
}
