import { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';
import { loadSync } from '@grpc/proto-loader';
import RPCHandler from '../core/RPCHandler';
import Settings from './SettingsProvider';
import { Connection } from './Database';
import Storage from './StorageHandler';
import Logger from '../util/Logger';
import Stats from './StatsHandler';
import Resolver from './Resolver';
import Patrons from './Patrons';
import { Db } from 'mongodb';
import Http from './Http';
import path from 'path';
import grpc from 'grpc';

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
		rpcHandler: RPCHandler;
		embed(msg: Message): number;
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;
		inhibitorHandler: InhibitorHandler;
	}
}

const packageDefinition = loadSync(path.join('grpc.proto'), {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true
});

const { routeguide } = grpc.loadPackageDefinition(packageDefinition);

export default class Client extends AkairoClient {
	public db!: Db;

	public rpc!: any;

	public http!: Http;

	public stats!: Stats;

	public patrons!: Patrons;

	public storage!: Storage;

	public resolver!: Resolver;

	public settings!: Settings;

	public rpcHandler!: RPCHandler;

	public logger: Logger = new Logger(this);

	public commandHandler: CommandHandler = new CommandHandler(this, {
		directory: path.join(__dirname, '..', 'commands'),
		aliasReplacement: /-/g,
		prefix: message => this.settings.get(message.guild!, 'prefix', '*'),
		allowMention: true,
		commandUtil: true,
		commandUtilLifetime: 15e4,
		commandUtilSweepInterval: 15e4,
		handleEdits: true,
		defaultCooldown: (message: Message) => this.patrons.get(message) ? 1000 : 3000,
		argumentDefaults: {
			prompt: {
				modifyStart: (msg, txt) => new MessageEmbed()
					.setAuthor(txt)
					.setFooter('Type `cancel` to cancel the command.'),
				modifyRetry: (msg, txt) => new MessageEmbed()
					.setAuthor(txt)
					.setFooter('Type `cancel` to cancel the command.'),
				timeout: new MessageEmbed()
					.setAuthor('Time ran out, command has been cancelled!'),
				ended: new MessageEmbed()
					.setAuthor('Too many retries, command has been cancelled!'),
				cancel: new MessageEmbed()
					.setAuthor('Command has been cancelled!'),
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
		super({ ownerID: config.owner }, {
			messageCacheMaxSize: 10,
			messageCacheLifetime: 150,
			messageSweepInterval: 150,
			ws: {
				intents: [
					'GUILDS',
					'GUILD_MESSAGES',
					'GUILD_MESSAGE_REACTIONS'
				]
			}
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

		await Connection.connect();
		this.db = Connection.db('clashperk');
		// await Connection.createIndex(this.db);

		this.settings = new Settings(this.db);

		this.stats = new Stats(this);

		this.http = new Http();
		await this.http.init();

		this.rpc = new (routeguide as any).RouteGuide(process.env.SERVER, grpc.credentials.createInsecure());

		this.patrons = new Patrons(this);
		await this.settings.init();
		await this.patrons.refresh();

		this.rpcHandler = new RPCHandler(this);

		this.storage = new Storage(this);

		this.resolver = new Resolver(this);

		this.once('ready', () => {
			if (process.env.NODE_ENV) return this.run();
		});
	}

	public embed(message: Message) {
		return this.settings.get<number>(message.guild!, 'color', 5861569);
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
