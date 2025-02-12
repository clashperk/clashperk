import { Collections, Settings } from '@app/constants';
import { CustomBotsEntity, PatreonMembersEntity } from '@app/entities';
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
import { COMMANDS } from '../../scripts/commands.js';
import { Client } from './client.js';

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

  public async findBot({ serviceId }: { serviceId: string }) {
    return this.collection.findOne({ serviceId });
  }

  public async addGuild({ serviceId, guildId }: { serviceId: string; guildId: string }) {
    return this.collection.updateOne({ serviceId }, { $addToSet: { guildIds: guildId } });
  }

  public async createCommands(serviceId: string, guildId: string, token: string) {
    try {
      const rest = new REST({ version: '10' }).setToken(token);
      const commands = await rest.put(Routes.applicationGuildCommands(serviceId, guildId), { body: COMMANDS });
      return commands as APIApplicationCommand[];
    } catch (error) {
      this.client.logger.error(error, { label: 'CUSTOM_BOT' });
      captureException(error);
      return [];
    }
  }

  public async createService(input: { application: DiscordBot; guildId: string; user: User; patronId: string; token: string }) {
    const value = await this.collection.findOneAndUpdate(
      {
        serviceId: input.application.id
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
        await this.collection.findOneAndUpdate(
          {
            serviceId: input.application.id
          },
          {
            $addToSet: {
              guildIds: input.guildId
            },
            $set: {
              patronId: input.patronId,
              userId: input.user.id,
              isLive: false,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          }
        );

        await this._deployWebhook({ content: `Service Created [${input.application.name}] (${input.application.id})` }).catch(() => null);
      }

      return isOk;
    } catch (error) {
      this.client.logger.error(error, { label: 'CUSTOM_BOT' });
      captureException(error);
      return null;
    }
  }

  public async suspendService(serviceId: string) {
    const app = await this.findBot({ serviceId });
    if (!app) return;

    await this._suspendService(serviceId);
    for (const guildId of app.guildIds) await this.client.settings.deleteCustomBot(guildId);

    await this._deployWebhook({ content: `Service Suspended [${app.name}] (<@${serviceId}>)` });
  }

  public async resumeService(serviceId: string) {
    const bot = await this.findBot({ serviceId });
    if (!bot) return;

    const app = await this.getApplication(bot.token);
    if (!app) {
      return this._deployWebhook({ content: `Service Resuming Failed (<@${serviceId}>)` });
    }

    await this._resumeService(serviceId);
    for (const guildId of bot.guildIds) await this.client.settings.setCustomBot(guildId);

    await this._deployWebhook({ content: `Service Resumed [${app.name}] (<@${serviceId}>)` });
  }

  public async deleteService(serviceId: string) {
    const bot = await this.findBot({ serviceId });
    if (!bot) return;

    await this._suspendService(serviceId);
    await this._deleteService(serviceId);
    await this.client.patreonHandler.detachCustomBot(bot.patronId);
    for (const guildId of bot.guildIds) await this.client.settings.deleteCustomBot(guildId);
    await this.collection.deleteOne({ serviceId });

    await this._deployWebhook({ content: `Service Deleted [${bot.name}] (<@${serviceId}>)` });
  }

  public async handleOnReady(bot: CustomBotsEntity) {
    const emojiServers = this.client.settings.get<string[]>('global', Settings.EMOJI_SERVERS, []);
    const guildIds = this.client.guilds.cache.map((guild) => guild.id);

    const hasInvited = emojiServers.every((id) => guildIds.includes(id));
    if (!hasInvited) return;

    await this.collection.updateOne({ serviceId: bot.serviceId }, { $set: { isLive: true } });
    for (const guildId of bot.guildIds) await this.client.settings.setCustomBot(guildId);

    await this._deployWebhook({ content: `Service Upgrading [${bot.name}] (<@${bot.serviceId}>)` });

    try {
      await this._upgradeService(bot.serviceId);
      this.client.logger.log(`Custom bot "${bot.name}" was set to production.`, { label: 'CUSTOM-BOT' });
    } catch (error) {
      captureException(error);

      await this.collection.updateOne({ serviceId: bot.serviceId }, { $set: { isLive: false } });
      for (const guildId of bot.guildIds) await this.client.settings.deleteCustomBot(guildId);
      this.client.logger.error(`Custom bot "${bot.name}" was failed to set to production.`, { label: 'CUSTOM-BOT' });

      await this._deployWebhook({ content: `Service Upgrading Failed [${bot.name}] (<@${bot.serviceId}>)` });
    }
  }

  public async checkGuild(bot: CustomBotsEntity) {
    const patreon = await this.client.db.collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS).findOne({ id: bot.patronId });
    if (!patreon) return;

    const guildIds = patreon.guilds.map((guild) => guild.id);
    if (!guildIds.length) return;

    const missingGuilds = guildIds.filter((id) => !bot.guildIds.includes(id) && this.client.guilds.cache.has(id));
    if (!missingGuilds.length) return;

    for (const guildId of missingGuilds) {
      await this.addGuild({ serviceId: bot.serviceId, guildId });
    }

    this.client.logger.log(`Guilds restored.`, { label: CustomBotManager.name });
  }

  private async _deployWebhook(payload: WebhookMessageCreateOptions) {
    const url = this.client.settings.get<string>('global', Settings.DEPLOYMENT_WEBHOOK_URL, null);
    if (!url) return;

    const webhook = new WebhookClient({ url });
    return webhook.send(payload);
  }

  private async _createService(input: CreateServiceInput) {
    const res = await fetch(`${process.env.DOCKER_SERVICE_API_BASE_URL}/services`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DOCKER_SERVICE_API_KEY!
      }
    });

    const body = (await res.json()) as { message: string };
    if (!res.ok) throw new Error(body.message);

    return body;
  }

  private async _upgradeService(serviceId: string) {
    const res = await fetch(`${process.env.DOCKER_SERVICE_API_BASE_URL}/services/${serviceId}/upgrade`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DOCKER_SERVICE_API_KEY!
      }
    });

    const body = (await res.json()) as { message: string };
    if (!res.ok) throw new Error(body.message);

    return body;
  }

  private async _suspendService(serviceId: string) {
    const res = await fetch(`${process.env.DOCKER_SERVICE_API_BASE_URL}/services/${serviceId}/suspend`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DOCKER_SERVICE_API_KEY!
      }
    });

    const body = (await res.json()) as { message: string };
    if (!res.ok) throw new Error(body.message);

    return body;
  }

  private async _resumeService(serviceId: string) {
    const res = await fetch(`${process.env.DOCKER_SERVICE_API_BASE_URL}/services/${serviceId}/resume`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DOCKER_SERVICE_API_KEY!
      }
    });

    const body = (await res.json()) as { message: string };
    if (!res.ok) throw new Error(body.message);

    return body;
  }

  private async _deleteService(serviceId: string) {
    const res = await fetch(`${process.env.DOCKER_SERVICE_API_BASE_URL}/services/${serviceId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DOCKER_SERVICE_API_KEY!
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
