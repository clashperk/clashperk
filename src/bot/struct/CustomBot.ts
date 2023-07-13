import { APIApplication, APIApplicationCommand, APIUser, ApplicationFlags, ApplicationFlagsBitField, REST, Routes } from 'discord.js';
import { container } from 'tsyringe';
import { captureException } from '@sentry/node';
import { COMMANDS } from '../../../scripts/Commands.js';
import Client from './Client.js';

const projectId = process.env.RAILWAY_PROJECT_ID!;
const environmentId = process.env.RAILWAY_ENV_ID!;

export class CustomBot {
	private readonly rest: REST;
	private readonly client: Client;
	public status: string;

	public constructor(token: string) {
		this.status = 'UNKNOWN';
		this.client = container.resolve(Client);
		this.rest = new REST({ version: '10' }).setToken(token);
	}

	public async getApplication() {
		try {
			const app = await this.rest.get(Routes.oauth2CurrentApplication());
			return app as Application;
		} catch (error) {
			console.error(error);
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
			console.error(error);
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
			console.error(error);
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

	public async createCommands(app: Application, guildId: string) {
		try {
			const commands = await this.rest.put(Routes.applicationGuildCommands(app.id, guildId), { body: COMMANDS });
			return commands as APIApplicationCommand[];
		} catch (error) {
			console.error(error);
			captureException(error);
			return [];
		}
	}

	private async gql<T>(query: string): Promise<T> {
		try {
			const res = await fetch('https://backboard.railway.app/graphql/v2', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${process.env.RAILWAY_API_TOKEN!}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ query })
			});

			const body = await res.json();
			if (!res.ok) throw new Error(body.errors?.at?.(0)?.message ?? res.statusText);
			return body as T;
		} catch (error) {
			throw error;
		}
	}

	public async createService(botToken: string, app: Application) {
		const serviceName = `[${app.id.slice(-5)}] ${app.name}`.substring(0, 32);
		const query = /* GraphQL */ `
			mutation ServiceCreate {
				serviceCreate(
					input: {
						name: "${serviceName}",
						source: { repo: "clashperk/clashperk" },
						branch: "railway",
						environmentId: "${environmentId}",
						projectId: "${projectId}",
						variables: {
							TOKEN: "${botToken}",
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
			console.error(error);
			captureException(error);
			return null;
		}
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
			console.error(error);
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
			console.error(error);
			captureException(error);
			return null;
		}
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
