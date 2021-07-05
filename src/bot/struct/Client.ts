import { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler } from 'discord-akairo';
import { MessageEmbed, Message, Intents } from 'discord.js';
import { loadSync } from '@grpc/proto-loader';
import RPCHandler from '../core/RPCHandler';
import Settings from './SettingsProvider';
import { Connection } from './Database';
import LinkHandler from './LinkHandler';
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

declare module 'discord-akairo' {
	interface AkairoClient {
		db: Db;
		rpc: any;
		http: Http;
		stats: Stats;
		logger: Logger;
		uuid(): string;
		patrons: Patrons;
		storage: Storage;
		resolver: Resolver;
		settings: Settings;
		links: LinkHandler;
		rpcHandler: RPCHandler;
		components: Set<string>;
		embed(msg: Message): number;
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;
		inhibitorHandler: InhibitorHandler;
	}
}

declare module 'discord.js' {
	interface CommandInteraction {
		author: {
			id: Snowflake;
			tag: string;
		};
	}

	interface ButtonInteraction {
		author: {
			id: Snowflake;
			tag: string;
		};
	}
}

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
	public rpcHandler!: RPCHandler;
	public components = new Set<string>();
	public logger: Logger = new Logger(this);

	public commandHandler: CommandHandler = new CommandHandler(this, {
		directory: path.join(__dirname, '..', 'commands'),
		aliasReplacement: /-/g,
		prefix: message => process.env.NODE_ENV === 'production' ? this.settings.get(message.guild!, 'prefix', '!') : '+',
		allowMention: true,
		commandUtil: true,
		commandUtilLifetime: 15e4,
		commandUtilSweepInterval: 15e4,
		handleEdits: true,
		defaultCooldown: (message: Message) => this.patrons.get(message) ? 1000 : 3000,
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
			messageCacheLifetime: 150,
			messageSweepInterval: 150,
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_WEBHOOKS,
				Intents.FLAGS.GUILD_MESSAGES,
				Intents.FLAGS.GUILD_MESSAGE_REACTIONS
			]
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
		await this.http.init();

		// @ts-expect-error
		this.rpc = new Route.RouteGuide(process.env.SERVER, gRPC.credentials.createInsecure());

		this.patrons = new Patrons(this);
		await this.settings.init();
		await this.patrons.refresh();

		this.rpcHandler = new RPCHandler(this);
		this.storage = new Storage(this);
		this.resolver = new Resolver(this);
		this.links = new LinkHandler(this);

		this.once('ready', () => {
			if (process.env.NODE_ENV === 'production') return this.run();
		});
	}

	public embed(message: Message) {
		return this.settings.get<number>(message.guild!, 'color', undefined);
	}

	public uuid() {
		const uniqueId = uuid.v4();
		this.components.add(uniqueId);
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
