import { FeatureFlags, Settings } from '@app/constants';
import { createClient as createClickHouseClient } from '@clickhouse/client';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ClusterClient, getInfo } from 'discord-hybrid-sharding';
import { BaseInteraction, Client as DiscordClient, GatewayIntentBits, Message, Options, User } from 'discord.js';
import { Db, MongoClient } from 'mongodb';
import { nanoid } from 'nanoid';
import { URL, fileURLToPath } from 'node:url';
import { PostHog } from 'posthog-node';
import { container } from 'tsyringe';
import { Enqueuer } from '../core/enqueuer.js';
import { RolesManager } from '../core/roles-manager.js';
import { CommandHandler, InhibitorHandler, ListenerHandler } from '../lib/handlers.js';
import { ClientUtil } from '../util/client.util.js';
import { i18n } from '../util/i18n.js';
import { Logger } from '../util/logger.js';
import { AnalyticsManager } from './analytics.js';
import { Autocomplete } from './autocomplete-client.js';
import { CapitalRaidScheduler } from './capital-raid-scheduler.js';
import { ClanGamesScheduler } from './clan-games-scheduler.js';
import { ClanWarScheduler } from './clan-war-scheduler.js';
import { ClashClient } from './clash-client.js';
import { CommandsMap } from './commands-map.js';
import { CustomBotManager } from './custom-bot-manager.js';
import { mongoClient } from './database.js';
import { GuildEventsHandler } from './guild-events-handler.js';
import { RedisService } from './redis-service.js';
import { Resolver } from './resolver.js';
import { RosterManager } from './roster-manager.js';
import { SettingsProvider } from './settings-provider.js';
import { StatsHandler } from './stats-handler.js';
import { StorageHandler } from './storage-handler.js';
import { Subscribers } from './subscribers.js';

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
  public coc: ClashClient;
  public stats!: StatsHandler;
  public customBotManager!: CustomBotManager;
  public storage!: StorageHandler;
  public clanWarScheduler!: ClanWarScheduler;
  public capitalRaidScheduler!: CapitalRaidScheduler;
  public clanGamesScheduler!: ClanGamesScheduler;
  public i18n = i18n;
  public guildEvents!: GuildEventsHandler;
  public inMaintenance = Boolean(false);
  public redis = new RedisService(this);
  public analytics = new AnalyticsManager(this);

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

  public clickhouse = createClickHouseClient({
    url: process.env.CLICKHOUSE_HOST,
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD
  });

  public enqueuer!: Enqueuer;
  public subscribers!: Subscribers;
  public components = new Map<string, string[]>();
  public resolver!: Resolver;
  public ownerId: string;
  public rosterManager!: RosterManager;
  public autocomplete!: Autocomplete;
  public cacheOverLimitGuilds = new Set<string>();
  public rolesManager = new RolesManager(this);
  public commands!: CommandsMap;
  public postHog: PostHog;

  public cluster: ClusterClient<this>;

  public constructor() {
    super({
      shardCount: getInfo().TOTAL_SHARDS,
      shards: getInfo().SHARD_LIST,

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
        ApplicationEmojiManager: 0,
        EntitlementManager: 0,
        GuildForumThreadManager: 0,
        GuildTextThreadManager: 0,
        ThreadManager: 0,
        AutoModerationRuleManager: 0,
        DMMessageManager: 0,
        GuildMessageManager: 0,
        MessageManager: 0,
        UserManager: {
          maxSize: 2,
          keepOverLimit: (user) => user.id === this.user!.id
        },
        GuildMemberManager: {
          maxSize: 2,
          keepOverLimit: (member) => {
            return member.id === this.user?.id || this.cacheOverLimitGuilds.has(member.guild.id);
          }
        }
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

    this.logger = new Logger(this);
    this.util = new ClientUtil(this);
    this.coc = new ClashClient(this);

    this.postHog = new PostHog(process.env.POSTHOG_API_KEY!, {
      host: 'https://us.i.posthog.com',
      personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY!,
      disableGeoip: true
    });

    this.ownerId = process.env.OWNER!;
    this.cluster = new ClusterClient(this);
    container.register(Client, { useValue: this });
  }

  public get applicationId() {
    return this.user!.id!;
  }

  public isFeatureEnabled(flag: FeatureFlags, distinctId: string | 'global') {
    return this.settings.isFeatureEnabled(flag, distinctId);
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

  public embed(guildRef: Message | string | BaseInteraction | null) {
    const guildId = typeof guildRef === 'string' ? guildRef : guildRef ? guildRef.guild : null;
    if (!guildId) return null;

    return this.settings.get<number>(guildId, Settings.COLOR, null);
  }

  public uuid(...userIds: string[]) {
    const uniqueId = nanoid();
    this.components.set(uniqueId, userIds);
    return uniqueId;
  }

  private async enqueue() {
    this.enqueuer.init();
    this.subscribers.init();
    this.clanGamesScheduler.init();
    this.capitalRaidScheduler.init();
    this.clanWarScheduler.init();
    this.guildEvents.init();
    this.rosterManager.init();
  }

  public async init(token: string) {
    await this.commandHandler.register();
    await this.listenerHandler.register();
    await this.inhibitorHandler.register();

    const globalMongoClient = new MongoClient(process.env.GLOBAL_MONGODB_URL!);
    this.globalDb = globalMongoClient.db('global_tracking');

    await mongoClient.connect().then(() => this.logger.info('Connected to MongoDB', { label: 'DATABASE' }));
    this.db = mongoClient.db(mongoClient.dbName);

    this.settings = new SettingsProvider(this);
    await this.settings.init({ globalOnly: true });

    await this.redis.connect();

    this.storage = new StorageHandler(this);
    this.enqueuer = new Enqueuer(this);
    this.stats = new StatsHandler(this);
    this.resolver = new Resolver(this);
    this.clanWarScheduler = new ClanWarScheduler(this);
    this.capitalRaidScheduler = new CapitalRaidScheduler(this);
    this.clanGamesScheduler = new ClanGamesScheduler(this);
    this.subscribers = new Subscribers(this);
    this.commands = new CommandsMap(this);
    this.guildEvents = new GuildEventsHandler(this);
    this.rosterManager = new RosterManager(this);
    this.autocomplete = new Autocomplete(this);
    this.customBotManager = new CustomBotManager();

    await this.coc.autoLogin();

    this.once('clientReady', async (client) => {
      // @ts-expect-error cluster typings
      client.cluster.triggerReady();

      await this.analytics.flush();
      await this.settings.init({ globalOnly: false });
      await this.subscribers.refresh();

      if (process.env.NODE_ENV === 'production') {
        await this.enqueue();
      }
    });

    this.logger.info('Connecting to the Gateway', { label: 'DISCORD' });
    return this.login(token);
  }
}
