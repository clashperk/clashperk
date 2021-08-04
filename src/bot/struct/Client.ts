import { MessageEmbed, Message, Intents, Snowflake, Options, LimitedCollection } from 'discord.js';
import { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler } from 'discord-akairo';
import { loadSync } from '@grpc/proto-loader';
import RPCHandler from '../core/RPCHandler';
import Settings from './SettingsProvider';
import { Connection } from './Database';
import LinkHandler from './LinkHandler';
import { Automaton } from './Automaton';
import Storage from './StorageHandler';
import * as gRPC from '@grpc/grpc-js';
import Logger from '../util/Logger';
import Stats from './StatsHandler';
import Resolver from './Resolver';
import Patrons from './Patrons';
import * as uuid from 'uuid';
import { Db } from 'mongodb';
import Http from './Http';
import path from 'path';

const packageDefinition = loadSync(
	path.join('scripts', 'routes.proto'),
	{
		keepCase: true,
		longs: String,
		enums: String,
		defaults: true,
		oneofs: true
	}
);

const { routeguide: Route } = gRPC.loadPackageDefinition(packageDefinition);

export default class Client extends AkairoClient {
	public db!: Db;
	public rpc!: any;
	public http!: Http;
	public stats!: Stats;
	public patrons!: Patrons;
	public storage!: Storage;
	public resolver!: Resolver;
	public settings!: Settings;
	public links!: LinkHandler;
	public automaton!: Automaton;
	public rpcHandler!: RPCHandler;
	public logger: Logger = new Logger(this);
	public components = new Map<string, Snowflake[]>();

	public commandHandler: CommandHandler = new CommandHandler(this, {
		directory: path.join(__dirname, '..', 'commands'),
		aliasReplacement: /-/g,
		allowMention: true,
		commandUtil: true,
		handleEdits: true,
		commandUtilLifetime: 5 * 60 * 1000,
		commandUtilSweepInterval: 5 * 60 * 1000,
		defaultCooldown: (message: Message) => this.patrons.get(message) ? 1000 : 3000,
		prefix: message => process.env.NODE_ENV === 'production' ? this.settings.get(message.guild!, 'prefix', '!') : '+',
		argumentDefaults: {
			prompt: {
				modifyStart: (msg, txt) => ({
					embeds: [
						new MessageEmbed()
							.setAuthor(txt)
							.setFooter('Type `cancel` to cancel the command.')
					]
				}),
				modifyRetry: (msg, txt) => ({
					embeds: [
						new MessageEmbed()
							.setAuthor(txt)
							.setFooter('Type `cancel` to cancel the command.')
					]
				}),
				timeout: {
					embeds: [
						new MessageEmbed()
							.setAuthor('Time ran out, command has been cancelled!')
					]
				},
				ended: {
					embeds: [
						new MessageEmbed()
							.setAuthor('Too many retries, command has been cancelled!')
					]
				},
				cancel: {
					embeds: [new MessageEmbed()
						.setAuthor('Command has been cancelled!')]
				},
				retries: 1,
				time: 30000
			}
		}
	});

	public inhibitorHandler: InhibitorHandler = new InhibitorHandler(this, {
		directory: path.join(__dirname, '..', 'inhibitors')
	});

	public listenerHandler: ListenerHandler = new ListenerHandler(this, {
		directory: path.join(__dirname, '..', 'listeners')
	});

	public constructor(config: any) {
		super({
			ownerID: config.owner,
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_WEBHOOKS,
				Intents.FLAGS.GUILD_MESSAGES,
				Intents.FLAGS.GUILD_MESSAGE_REACTIONS
			],
			makeCache: Options.cacheWithLimits({
				MessageManager: {
					maxSize: 15,
					sweepInterval: 5 * 60,
					sweepFilter: LimitedCollection.filterByLifetime({
						lifetime: 10 * 60,
						getComparisonTimestamp: msg => msg.createdTimestamp
					})
				},
				PresenceManager: 0,
				UserManager: {
					maxSize: 3,
					keepOverLimit: user => user.id === this.user!.id
				},
				GuildMemberManager: {
					maxSize: 3,
					keepOverLimit: member => member.id === this.user!.id
				}
			})
		});
	}

	private async init() {
		this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
		this.commandHandler.useListenerHandler(this.listenerHandler);
		this.listenerHandler.setEmitters({
			commandHandler: this.commandHandler,
			inhibitorHandler: this.inhibitorHandler,
			listenerHandler: this.listenerHandler
		});

		this.commandHandler.loadAll();
		this.inhibitorHandler.loadAll();
		this.listenerHandler.loadAll();

		await Connection.connect().then(() => this.logger.info('Connected to MongoDB', { label: 'DATABASE' }));
		this.db = Connection.db('clashperk');
		// await Connection.createIndex(this.db);

		this.settings = new Settings(this.db);
		this.stats = new Stats(this);

		this.http = new Http();
		await this.http.login();

		// @ts-expect-error
		this.rpc = new Route.RouteGuide(process.env.SERVER, gRPC.credentials.createInsecure());

		this.patrons = new Patrons(this);
		await this.settings.init();
		await this.patrons.refresh();

		this.storage = new Storage(this);
		this.resolver = new Resolver(this);
		this.links = new LinkHandler(this);
		this.automaton = new Automaton(this);
		this.rpcHandler = new RPCHandler(this);

		this.once('ready', () => {
			if (process.env.NODE_ENV === 'production') return this.run();
		});
	}

	public embed(message: Message | Snowflake) {
		return this.settings.get<number>(typeof message === 'string' ? message : message.guild!, 'color', undefined);
	}

	public uuid(...userIds: Snowflake[]) {
		const uniqueId = uuid.v4();
		this.components.set(uniqueId, userIds);
		return uniqueId;
	}

	private run() {
		this.patrons.init();
		this.rpcHandler.init();
		return Promise.resolve();
	}

	public async start(token: string) {
		await this.init();
		return this.login(token);
	}
}

declare module 'discord-akairo' {
	interface AkairoClient {
		db: Db;
		rpc: any;
		http: Http;
		stats: Stats;
		logger: Logger;
		patrons: Patrons;
		storage: Storage;
		resolver: Resolver;
		settings: Settings;
		links: LinkHandler;
		automaton: Automaton;
		rpcHandler: RPCHandler;
		embed(msg: Message): number;
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;
		inhibitorHandler: InhibitorHandler;
		components: Map<string, Snowflake[]>;
		uuid(...userIds: Snowflake[]): string;
	}
}

declare module 'discord.js' {
	interface CommandInteraction {
		author: User;
	}

	interface ButtonInteraction {
		author: User;
	}
}
