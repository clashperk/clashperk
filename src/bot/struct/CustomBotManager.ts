import { captureException } from '@sentry/node';
import {
	APIApplication,
	APIApplicationCommand,
	APIUser,
	ApplicationFlags,
	ApplicationFlagsBitField,
	REST,
	Routes,
	User,
	WebhookClient,
	WebhookMessageCreateOptions
} from 'discord.js';
import { Collection } from 'mongodb';
import { container } from 'tsyringe';
import { COMMANDS } from '../../../scripts/Commands.js';
import { CustomBotsEntity } from '../entities/custom-bot.entity.js';
import { Collections, Settings } from '../util/Constants.js';
import Client from './Client.js';

export class CustomBotManager {
	private readonly client: Client;
	protected collection: Collection<CustomBotsEntity>;

	public constructor() {
		this.client = container.resolve(Client);
		this.collection = this.client.db.collection(Collections.CUSTOM_BOTS);
	}

	public async getApplication(token: string) {
		try {
			const rest = new REST({ version: '10' }).setToken(token);
			const app = await rest.get(Routes.oauth2CurrentApplication());
			return app as DiscordBot;
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return null;
		}
	}

	public hasIntents(application: DiscordBot) {
		const flags = new ApplicationFlagsBitField(application.flags);
		return flags.has(ApplicationFlags.GatewayGuildMembersLimited);
	}

	public isPublic(application: DiscordBot) {
		return application.bot_public;
	}

	public async findBot({ applicationId }: { applicationId: string }) {
		return this.collection.findOne({ applicationId });
	}

	public async addGuild({ applicationId, guildId }: { applicationId: string; guildId: string }) {
		return this.collection.updateOne({ applicationId }, { $addToSet: { guildIds: guildId } });
	}

	public async createCommands(applicationId: string, guildId: string, token: string) {
		try {
			const rest = new REST({ version: '10' }).setToken(token);
			const commands = await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: COMMANDS });
			return commands as APIApplicationCommand[];
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return [];
		}
	}

	public async createService(input: { application: DiscordBot; guildId: string; user: User; patronId: string; token: string }) {
		const { value } = await this.collection.findOneAndUpdate(
			{
				applicationId: input.application.id
			},
			{
				$addToSet: {
					guildIds: input.guildId
				},
				$set: {
					name: input.application.bot.username,
					token: input.token,
					patronId: input.patronId,
					userId: input.user.id,
					isLive: false,
					updatedAt: new Date()
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{ upsert: true, returnDocument: 'after' }
		);
		if (!value) return null;

		try {
			const result = await this._createService({
				isProd: false,
				name: input.application.bot.username,
				serviceId: input.application.id,
				token: input.token
			});

			const isOk = result.message === 'OK';
			if (isOk) {
				await this._deployWebhook({ content: `Service Created (${input.application.id})` }).catch(() => null);
			}

			return isOk;
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return null;
		}
	}

	public async suspendService(applicationId: string) {
		const app = await this.findBot({ applicationId });
		if (!app) return;

		await this._suspendService(applicationId);
		for (const guildId of app.guildIds) await this.client.settings.deleteCustomBot(guildId);

		await this._deployWebhook({ content: `Service Suspended (${applicationId})` });
	}

	public async resumeService(applicationId: string) {
		const bot = await this.findBot({ applicationId });
		if (!bot) return;

		const app = await this.getApplication(bot.token);
		if (!app) {
			return this._deployWebhook({ content: `Service Resuming Failed (${applicationId})` });
		}

		await this._resumeService(applicationId);
		for (const guildId of bot.guildIds) await this.client.settings.setCustomBot(guildId);

		await this._deployWebhook({ content: `Service Resumed (${applicationId})` });
	}

	public async deleteService(applicationId: string) {
		const bot = await this.findBot({ applicationId });
		if (!bot) return;

		await this._suspendService(applicationId);
		await this._deleteService(applicationId);
		await this.client.patrons.detachCustomBot(bot.patronId);
		for (const guildId of bot.guildIds) await this.client.settings.setCustomBot(guildId);
		await this.collection.deleteOne({ applicationId });

		await this._deployWebhook({ content: `Service Deleted (${applicationId})` });
	}

	public async handleOnReady(bot: CustomBotsEntity) {
		const emojiServers = this.client.settings.get<string[]>('global', Settings.EMOJI_SERVERS, []);
		const guildIds = this.client.guilds.cache.map((guild) => guild.id);

		const hasInvited = emojiServers.every((id) => guildIds.includes(id));
		if (!hasInvited) return;

		await this.collection.updateOne({ applicationId: bot.applicationId }, { $set: { isLive: true } });
		for (const guildId of bot.guildIds) await this.client.settings.setCustomBot(guildId);

		await this._deployWebhook({ content: `Service Upgrading (${bot.applicationId})` });

		try {
			await this._upgradeService(bot.applicationId);
			this.client.logger.debug(`Custom bot "${bot.name}" was set to production.`, { label: 'CUSTOM-BOT' });
		} catch (error) {
			captureException(error);

			await this.collection.updateOne({ applicationId: bot.applicationId }, { $set: { isLive: false } });
			for (const guildId of bot.guildIds) await this.client.settings.deleteCustomBot(guildId);
			this.client.logger.error(`Custom bot "${bot.name}" was failed to set to production.`, { label: 'CUSTOM-BOT' });

			await this._deployWebhook({ content: `Service Upgrading Failed (${bot.applicationId})` });
		}
	}

	private async _deployWebhook(payload: WebhookMessageCreateOptions) {
		const url = this.client.settings.get<string>('global', Settings.DEPLOYMENT_WEBHOOK_URL, null);
		if (!url) return;

		const webhook = new WebhookClient({ url });
		return webhook.send(payload);
	}

	private async _createService(input: CreateServiceInput) {
		const res = await fetch(`${process.env.CUSTOM_BOT_SERVICE}/services`, {
			method: 'POST',
			body: JSON.stringify(input),
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': process.env.CUSTOM_BOT_SERVICE_TOKEN!
			}
		});

		const body = (await res.json()) as { message: string };
		if (!res.ok) throw new Error(body.message);

		return body;
	}

	private async _upgradeService(applicationId: string) {
		const res = await fetch(`${process.env.CUSTOM_BOT_SERVICE}/services/${applicationId}/upgrade`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': process.env.CUSTOM_BOT_SERVICE_TOKEN!
			}
		});

		const body = (await res.json()) as { message: string };
		if (!res.ok) throw new Error(body.message);

		return body;
	}

	private async _suspendService(applicationId: string) {
		const res = await fetch(`${process.env.CUSTOM_BOT_SERVICE}/services/${applicationId}/suspend`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': process.env.CUSTOM_BOT_SERVICE_TOKEN!
			}
		});

		const body = (await res.json()) as { message: string };
		if (!res.ok) throw new Error(body.message);

		return body;
	}

	private async _resumeService(applicationId: string) {
		const res = await fetch(`${process.env.CUSTOM_BOT_SERVICE}/services/${applicationId}/suspend`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': process.env.CUSTOM_BOT_SERVICE_TOKEN!
			}
		});

		const body = (await res.json()) as { message: string };
		if (!res.ok) throw new Error(body.message);

		return body;
	}

	private async _deleteService(applicationId: string) {
		const res = await fetch(`${process.env.CUSTOM_BOT_SERVICE}/services/${applicationId}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': process.env.CUSTOM_BOT_SERVICE_TOKEN!
			}
		});

		const body = (await res.json()) as { message: string };
		if (!res.ok) throw new Error(body.message);

		return body;
	}
}

interface CreateServiceInput {
	name: string;
	serviceId: string;
	token: string;
	isProd: boolean;
}

type DiscordBot = APIApplication & { bot: APIUser };
