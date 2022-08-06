import { fileURLToPath, URL } from 'url';
import Discord, { Intents, Interaction, Message, Options, Snowflake } from 'discord.js';
import { Db } from 'mongodb';
import { container } from 'tsyringe';
import { nanoid } from 'nanoid';
import * as Redis from 'redis';
import RPCHandler from '../core/RPCHandler';
import { CommandHandler, InhibitorHandler, ListenerHandler } from '../lib';
import Logger from '../util/Logger';
import { Settings } from '../util/Constants';
import { i18n } from '../util/i18n';
import { Automaton } from './Automaton';
import { Database } from './Database';
import Http from './Http';
import Patrons from './Patrons';
import SettingsProvider from './SettingsProvider';
import StatsHandler from './StatsHandler';
import StorageHandler from './StorageHandler';
import Resolver from './Resolver';
import RemindScheduler from './RemindScheduler';

export class Client extends Discord.Client {
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
	public settings!: SettingsProvider;
	public http = new Http();
	public stats!: StatsHandler;
	public storage!: StorageHandler;
	public remindScheduler!: RemindScheduler;
	public i18n = i18n;

	public redis = Redis.createClient({
		url: process.env.REDIS_URL
	});

	public subscriber = this.redis.duplicate();
	public publisher = this.redis.duplicate();

	public rpcHandler!: RPCHandler;
	public patrons!: Patrons;
	public automaton!: Automaton;
	public components = new Map<string, Snowflake[]>();
	public resolver!: Resolver;
	public ownerId: string;

	public constructor() {
		super({
			intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_WEBHOOKS, Intents.FLAGS.GUILD_MESSAGES],
			makeCache: Options.cacheWithLimits({
				UserManager: {
					maxSize: 50,
					keepOverLimit: (user) => user.id === this.user!.id
				},
				GuildMemberManager: {
					maxSize: 50,
					keepOverLimit: (member) => member.id === this.user!.id
				},
				MessageManager: 0,
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
				GuildEmojiManager: 0
			})
		});

		this.logger = new Logger(this);
		this.ownerId = process.env.OWNER!;
		container.register(Client, { useValue: this });
	}

	public isOwner(user: string | Discord.User) {
		const userId = this.users.resolveId(user);
		return userId === process.env.OWNER!;
	}

	public embed(guild: Message | Snowflake | Interaction) {
		return this.settings.get<number>(typeof guild === 'string' ? guild : guild.guild!, Settings.COLOR, null);
	}

	public uuid(...userIds: Snowflake[]) {
		const uniqueId = nanoid();
		this.components.set(uniqueId, userIds);
		return uniqueId;
	}

	private run() {
		this.patrons.init();
		this.rpcHandler.init();
		this.remindScheduler.init();
	}

	public async init(token: string) {
		await this.commandHandler.register();
		await this.listenerHandler.register();
		await this.inhibitorHandler.register();

		await Database.connect().then(() => this.logger.info('Connected to MongoDB', { label: 'DATABASE' }));
		this.db = Database.db('clashperk');
		await Database.createIndex(this.db);

		this.settings = new SettingsProvider(this.db);
		await this.settings.init();

		await this.redis.connect();
		await this.subscriber.connect();
		await this.publisher.connect();

		this.storage = new StorageHandler(this);
		this.rpcHandler = new RPCHandler(this);

		this.patrons = new Patrons(this);
		await this.patrons.refresh();

		this.automaton = new Automaton(this);
		this.stats = new StatsHandler(this);
		this.resolver = new Resolver(this);
		this.remindScheduler = new RemindScheduler(this);

		await this.http.login();

		this.once('ready', () => {
			if (process.env.NODE_ENV === 'production') return this.run();
		});

		return this.login(token);
	}
}

export default Client;
