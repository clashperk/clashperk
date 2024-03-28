import { captureException } from '@sentry/node';
import { APIApplication, APIApplicationCommand, APIUser, ApplicationFlags, ApplicationFlagsBitField, REST, Routes, User } from 'discord.js';
import { Collection } from 'mongodb';
import { container } from 'tsyringe';
import { COMMANDS } from '../../../scripts/Commands.js';
import { Collections, Settings } from '../util/Constants.js';
import Client from './Client.js';

const projectId = process.env.RAILWAY_PROJECT_ID!;
const environmentId = process.env.RAILWAY_ENVIRONMENT_ID!;

export interface ICustomBot {
	applicationId: string;
	token: string;
	name: string;
	userId: string;
	patronId: string;
	serviceId: string;
	guildIds: string[];
	isLive: boolean;
}

export class CustomBot {
	private readonly rest: REST;
	private readonly client: Client;
	protected collection: Collection<ICustomBot>;

	public constructor(token: string) {
		this.client = container.resolve(Client);
		this.rest = new REST({ version: '10' }).setToken(token);
		this.collection = this.client.db.collection(Collections.CUSTOM_BOTS);
	}

	public async getApplication() {
		try {
			const app = await this.rest.get(Routes.oauth2CurrentApplication());
			return app as Application;
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return null;
		}
	}

	public hasIntents(application: Application) {
		const flags = new ApplicationFlagsBitField(application.flags);
		return flags.has(ApplicationFlags.GatewayGuildMembersLimited);
	}

	public isPublic(application: Application) {
		return application.bot_public;
	}

	public async hasDeployed(serviceId: string) {
		try {
			const edges = await this.getDeployments(serviceId);
			if (!edges) return false;
			return edges.some((edge) => edge.node.status === 'SUCCESS');
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return false;
		}
	}

	public async getDeploymentStatus(serviceId: string) {
		try {
			const edges = await this.getDeployments(serviceId);
			if (!edges) return 'UNKNOWN';
			return edges.at(0)?.node.status ?? 'UNKNOWN';
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return 'UNKNOWN';
		}
		// 'BUILDING', 'DEPLOYING', 'INITIALIZING', 'QUEUED', 'WAITING'
		// 'SUCCESS', 'SKIPPED', 'CRASHED', 'FAILED', 'REMOVED'
	}

	public checkDeploymentStatus(serviceId: string, callback: (status: string) => unknown) {
		return new Promise<string>((resolve) => {
			const interval = setInterval(async () => {
				const status = await this.getDeploymentStatus(serviceId);
				if (['SUCCESS', 'SKIPPED', 'CRASHED', 'FAILED', 'REMOVED'].includes(status)) {
					clearInterval(interval);
					resolve(status);
				}
				callback(status);
			}, 3500);
		});
	}

	public async findBot({ applicationId }: { applicationId: string }) {
		return this.collection.findOne({ applicationId });
	}

	public async registerBot({
		application,
		guildId,
		user,
		patronId,
		token,
		serviceId
	}: {
		application: Application;
		guildId: string;
		user: User;
		patronId: string;
		token: string;
		serviceId: string;
	}) {
		const { value } = await this.collection.findOneAndUpdate(
			{
				applicationId: application.id
			},
			{
				$addToSet: {
					guildIds: guildId
				},
				$set: {
					name: application.bot.username,
					token,
					patronId,
					serviceId,
					userId: user.id,
					isLive: false,
					updatedAt: new Date()
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{ upsert: true, returnDocument: 'after' }
		);
		return value!;
	}

	public async createCommands(appId: string, guildId: string) {
		try {
			const commands = await this.rest.put(Routes.applicationGuildCommands(appId, guildId), { body: COMMANDS });
			return commands as APIApplicationCommand[];
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return [];
		}
	}

	private async gql<T>(query: string): Promise<T> {
		const res = await fetch('https://backboard.railway.app/graphql/v2', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${process.env.RAILWAY_API_TOKEN!}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query })
		});

		const body = (await res.json()) as Record<string, any>;
		if (!res.ok || body?.data === null) {
			throw new Error(body.errors?.at?.(0)?.message ?? res.statusText);
		}

		return body as T;
	}

	public async createService(botToken: string, app: Application) {
		const serviceName = `[${app.id.slice(-5)}] ${app.name}`.slice(0, 32);
		const query = /* GraphQL */ `
			mutation ServiceCreate {
				serviceCreate(
					input: {
						name: "${serviceName}",
						source: { repo: "clashperk/clashperk" },
						branch: "deploy",
						environmentId: "${environmentId}",
						projectId: "${projectId}",
						variables: {
							TOKEN: "${botToken}",
							SENTRY: "\${{shared.SENTRY}}",
							RAILWAY_API_TOKEN: "\${{shared.RAILWAY_API_TOKEN}}",
							ASSET_API_BACKEND: "\${{shared.ASSET_API_BACKEND}}",
							BASE_URL: "\${{shared.BASE_URL}}",
							CLASH_TOKENS: "\${{shared.CLASH_TOKENS}}",
							DBL: "\${{shared.DBL}}",
							DISCORD_LINK_PASSWORD: "\${{shared.DISCORD_LINK_PASSWORD}}",
							DISCORD_LINK_USERNAME: "\${{shared.DISCORD_LINK_USERNAME}}",
							ES_CA_CRT: "\${{shared.ES_CA_CRT}}",
							ES_HOST: "\${{shared.ES_HOST}}",
							ES_PASSWORD: "\${{shared.ES_PASSWORD}}",
							FORCE_COLOR: "\${{shared.FORCE_COLOR}}",
							GOOGLE: "\${{shared.GOOGLE}}",
							GOOGLE_CLIENT_ID: "\${{shared.GOOGLE_CLIENT_ID}}",
							GOOGLE_CLIENT_SECRET: "\${{shared.GOOGLE_CLIENT_SECRET}}",
							GOOGLE_REFRESH_TOKEN: "\${{shared.GOOGLE_REFRESH_TOKEN}}",
							GUILD_ID: "\${{shared.GUILD_ID}}",
							JWT_DECODE_SECRET: "\${{shared.JWT_DECODE_SECRET}}",
							JWT_SECRET: "\${{shared.JWT_SECRET}}",
							MIXPANEL_TOKEN: "\${{shared.MIXPANEL_TOKEN}}",
							MONGODB_URL: "\${{shared.MONGODB_URL}}",
							OWNER: "\${{shared.OWNER}}",
							PATREON_API: "\${{shared.PATREON_API}}",
							REDIS_URL: "\${{shared.REDIS_URL}}",
							TZ: "\${{shared.TZ}}"
						}
					}
				) {
					id
					name
					createdAt
				}
			}
		`;

		try {
			const { data } = await this.gql<ServiceCreate>(query);
			if (!data) return null;
			return data.serviceCreate;
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return null;
		}
	}

	public async upsertCollectionVariables(serviceId: string) {
		const query = /* GraphQL */ `
			mutation SharedVariableConfigure {
				variableCollectionUpsert(
					input: {
						environmentId: "${environmentId}",
						serviceId: "${serviceId}",
						projectId: "${projectId}",
						replace: false,
						variables: {
							NODE_ENV: "production",
						}
					}
				)
				serviceInstanceRedeploy(environmentId: "${environmentId}", serviceId: "${serviceId}")
			}
		`;

		const { data } = await this.gql<SharedVariableConfigure>(query);
		return data?.variableCollectionUpsert;
	}

	public async getDeployments(serviceId: string) {
		const query = /* GraphQL */ `
			query Deployments {
				deployments(
					input: {
						includeDeleted: false
						projectId: "${projectId}"
						serviceId: "${serviceId}"
						environmentId: "${environmentId}"
					}
					last: 1
				) {
					edges {
						node {
							createdAt
							id
							status
						}
					}
				}
			}
		`;

		try {
			const { data } = await this.gql<Deployments>(query);
			if (!data) return null;
			return data.deployments.edges;
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return null;
		}
	}

	public async deleteService(serviceId: string) {
		const query = /* GraphQL */ `
			mutation ServiceDelete {
				serviceDelete(id: "${serviceId}")
			}
		`;

		try {
			const { data } = await this.gql<ServiceDelete>(query);
			if (!data) return null;
			return data.serviceDelete;
		} catch (error) {
			this.client.logger.error(error, { label: 'CUSTOM_BOT' });
			captureException(error);
			return null;
		}
	}

	public async handleOnReady(app: ICustomBot) {
		const emojiServers = this.client.settings.get<string[]>('global', Settings.EMOJI_SERVERS, []);
		const guildIds = this.client.guilds.cache.map((guild) => guild.id);

		const hasInvited = emojiServers.every((id) => guildIds.includes(id));
		if (!hasInvited) return;

		const customBot = new CustomBot(app.token);
		const isProd = await customBot.upsertCollectionVariables(app.serviceId);
		if (isProd) {
			this.client.logger.debug(`Custom bot "${app.name}" was set to production.`, { label: 'CUSTOM-BOT' });
		}

		for (const guildId of app.guildIds) {
			await this.client.settings.setCustomBot(guildId);
		}

		return this.collection.updateOne({ applicationId: app.applicationId }, { $set: { isLive: true } });
	}
}

interface ServiceCreate {
	data: {
		serviceCreate: {
			id: string;
			name: string;
			createdAt: string;
		};
	} | null;
}

interface SharedVariableConfigure {
	data: {
		variableCollectionUpsert: boolean;
	} | null;
}

interface ServiceDelete {
	data: {
		serviceDelete: boolean;
	} | null;
}

interface Deployments {
	data: {
		deployments: {
			edges: {
				node: {
					createdAt: string;
					id: string;
					status: string;
				};
			}[];
		};
	} | null;
}

type Application = APIApplication & { bot: APIUser };
