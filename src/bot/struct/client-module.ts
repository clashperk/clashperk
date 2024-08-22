import { Client as ElasticClient } from '@elastic/elasticsearch';
import { BaseInteraction, Client as DiscordClient, GatewayIntentBits, Message, Options, User } from 'discord.js';
import { Db, MongoClient } from 'mongodb';
import { nanoid } from 'nanoid';
import { URL, fileURLToPath } from 'node:url';
import { PostHog } from 'posthog-node';
import { container } from 'tsyringe';
import { RolesManager } from '../core/roles-manager.js';
import RPCHandler from '../core/rpc-handler.js';
import { CommandHandler, InhibitorHandler, ListenerHandler } from '../lib/index.js';
import { ClientUtil } from '../util/client-util.js';
import { FeatureFlags, Settings } from '../util/constants.js';
import { i18n } from '../util/i18n.js';
import Logger from '../util/logger.js';
import { Autocomplete } from './autocomplete-client.js';
import CapitalRaidScheduler from './capital-raid-scheduler.js';
import ClanGamesScheduler from './clan-games-scheduler.js';
import ClanWarScheduler from './clan-war-scheduler.js';
import { CommandsMap } from './commands-map.js';
import { CustomBotManager } from './custom-bot-manager.js';
import { mongoClient } from './database.js';
import { GuildEventsHandler } from './guild-events-handler.js';
import Http from './http.js';
import { PatreonHandler } from './patreon-handler.js';
import RedisService from './redis-service.js';
import Resolver from './resolver.js';
import { RosterManager } from './roster-manager.js';
import SettingsProvider from './settings-provider.js';
import StatsHandler from './stats-handler.js';
import StorageHandler from './storage-handler.js';

export class Client extends DiscordClient {
  public commandHandler = new CommandHandler(this, {
    directory: fileURLToPath(new URL('../commands', import.meta.url))
  });

  public listenerHandler = new ListenerHandler(this, {
    directory: fileURLToPath(new URL('../listeners', import.meta.url))
  });

  public inhibitorHandler = new InhibitorHandler(this, {
    directory: fileURLToPath(new URL('../inhibitors', import.meta.url))
  });

  public logger: Logger;
  public db!: Db;
  public globalDb!: Db;
  public util: ClientUtil;
  public settings!: SettingsProvider;
  public http: Http;
  public stats!: StatsHandler;
  public customBotManager!: CustomBotManager;
  public storage!: StorageHandler;
  public warScheduler!: ClanWarScheduler;
  public raidScheduler!: CapitalRaidScheduler;
  public cgScheduler!: ClanGamesScheduler;
  public i18n = i18n;
  public guildEvents!: GuildEventsHandler;
  public inMaintenance = Boolean(false);
  public redis = new RedisService(this);

  public elastic = new ElasticClient({
    node: process.env.ES_HOST!,
    auth: {
      username: 'elastic',
      password: process.env.ES_PASSWORD!
    },
    tls: {
      ca: process.env.ES_CA_CRT!,
      rejectUnauthorized: false
    }
  });

  public subscriber = this.redis.connection.duplicate();
  public publisher = this.redis.connection.duplicate();

  public rpcHandler!: RPCHandler;
  public patreonHandler!: PatreonHandler;
  public components = new Map<string, string[]>();
  public resolver!: Resolver;
  public ownerId: string;
  public rosterManager!: RosterManager;
  public autocomplete!: Autocomplete;
  public cacheOverLimitGuilds = new Set<string>();
  public rolesManager = new RolesManager(this);
  public commands!: CommandsMap;
  public postHog: PostHog;

  public constructor() {
    super({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.GuildMessages],
      makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        PresenceManager: 0,
        VoiceStateManager: 0,
        GuildBanManager: 0,
        GuildInviteManager: 0,
        GuildScheduledEventManager: 0,
        GuildStickerManager: 0,
        StageInstanceManager: 0,
        ReactionUserManager: 0,
        ReactionManager: 0,
        BaseGuildEmojiManager: 0,
        GuildEmojiManager: 0,
        ApplicationCommandManager: 0,
        ThreadMemberManager: 0,
        MessageManager: 5,
        UserManager: {
          maxSize: 2,
          keepOverLimit: (user) => user.id === this.user!.id
        },
        GuildMemberManager: {
          maxSize: 2,
          keepOverLimit: (member) => {
            return member.id === this.user?.id || this.cacheOverLimitGuilds.has(member.guild.id);
          }
        },
        AutoModerationRuleManager: 0,
        DMMessageManager: 0,
        GuildMessageManager: 5
      }),
      sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: {
          interval: 5 * 60,
          lifetime: 10 * 60
        },
        guildMembers: {
          interval: 5 * 60,
          filter: () => (member) => member.id !== this.user!.id && !this.cacheOverLimitGuilds.has(member.guild.id)
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - this is fine
    this.publisher.on('error', (error) => this.logger.error(error, { label: 'REDIS' }));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - this is fine
    this.subscriber.on('error', (error) => this.logger.error(error, { label: 'REDIS' }));

    this.logger = new Logger(this);
    this.util = new ClientUtil(this);
    this.http = new Http(this);

    this.postHog = new PostHog(process.env.POSTHOG_API_KEY!, {
      host: 'https://us.i.posthog.com',
      personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY!,
      preloadFeatureFlags: true,
      disableGeoip: true,
      bootstrap: {
        featureFlags: {
          [FeatureFlags.GUILD_EVENT_SCHEDULER]: true,
          [FeatureFlags.COMMAND_WHITELIST]: true
        }
      },
      featureFlagsPollingInterval: 30_000
    });

    this.ownerId = process.env.OWNER!;
    container.register(Client, { useValue: this });
  }

  public async isFeatureEnabled(flag: FeatureFlags, distinctId: string | 'global') {
    const isEnabled = await this.postHog.isFeatureEnabled(flag, distinctId, {
      onlyEvaluateLocally: true,
      disableGeoip: true,
      sendFeatureFlagEvents: false
    });
    return !!isEnabled;
  }

  public isOwner(user: string | User) {
    const userId = this.users.resolveId(user);
    return userId === process.env.OWNER!;
  }

  public isCustom() {
    return !['635462521729581058', '526971716711350273', '1228022517667467367'].includes(this.user!.id);
  }

  public isPrimary() {
    return this.user!.id === '526971716711350273';
  }

  public embed(guild: Message | string | BaseInteraction) {
    return this.settings.get<number>(typeof guild === 'string' ? guild : guild.guild!, Settings.COLOR, null);
  }

  public uuid(...userIds: string[]) {
    const uniqueId = nanoid();
    this.components.set(uniqueId, userIds);
    return uniqueId;
  }

  private run() {
    this.patreonHandler.init();
    this.rpcHandler.init();
    this.cgScheduler.init();
    this.raidScheduler.init();
    this.warScheduler.init();
    this.guildEvents.init();
    this.rosterManager.init();
  }

  public async init(token: string) {
    await this.commandHandler.register();
    await this.listenerHandler.register();
    await this.inhibitorHandler.register();

    await mongoClient.connect().then(() => this.logger.info('Connected to MongoDB', { label: 'DATABASE' }));
    this.db = mongoClient.db(mongoClient.dbName);
    this.globalDb = new MongoClient(process.env.GLOBAL_MONGO_URI!).db('global_tracking');

    this.settings = new SettingsProvider(this.db);
    await this.settings.init();

    await this.redis.connection.connect();
    await Promise.all([this.subscriber.connect(), this.publisher.connect()]);

    this.storage = new StorageHandler(this);
    this.rpcHandler = new RPCHandler(this);

    this.patreonHandler = new PatreonHandler(this);
    await this.patreonHandler.refresh();

    this.stats = new StatsHandler(this);
    this.resolver = new Resolver(this);
    this.warScheduler = new ClanWarScheduler(this);
    this.raidScheduler = new CapitalRaidScheduler(this);
    this.cgScheduler = new ClanGamesScheduler(this);
    this.commands = new CommandsMap(this);
    this.guildEvents = new GuildEventsHandler(this);
    this.rosterManager = new RosterManager(this);
    this.autocomplete = new Autocomplete(this);
    this.customBotManager = new CustomBotManager();

    await this.http.autoLogin();

    this.once('ready', () => {
      if (process.env.NODE_ENV === 'production') return this.run();
    });

    this.logger.debug('Connecting to the Gateway', { label: 'DISCORD' });
    return this.login(token);
  }

  async close() {
    try {
      await this.subscriber.disconnect();
      await this.publisher.disconnect();
      await this.redis.disconnect();
      await this.elastic.close();
      await mongoClient.close(true);
    } finally {
      process.exit();
    }
  }
}

export default Client;
