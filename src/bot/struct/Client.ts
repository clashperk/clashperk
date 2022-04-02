import Discord, { Intents, Interaction, Message, Snowflake } from 'discord.js';
import { Db } from 'mongodb';
import { container } from 'tsyringe';
import { fileURLToPath, URL } from 'url';
import RPCHandler from '../core/RPCHandler';
import { CommandHandler, InhibitorHandler, ListenerHandler } from '../lib';
import Logger from '../util/Logger';
import { Automaton } from './Automaton';
import { Database } from './Database';
import Http from './Http';
import Patrons from './Patrons';
import SettingsProvider from './SettingsProvider';
import StatsHandler from './StatsHandler';
import StorageHandler from './StorageHandler';
import * as uuid from 'uuid';
import Resolver from './Resolver';
import RemindScheduler from './RemindScheduler';
import { loadSync } from '@grpc/proto-loader';
import * as gRPC from '@grpc/grpc-js';
import path from 'path';
import { Settings } from '../util/Constants';
import { i18n } from '../util/i18n';

const { route: Route } = gRPC.loadPackageDefinition(
	loadSync(path.join('scripts/routes.proto'), {
		keepCase: true,
		longs: String,
		enums: String,
		defaults: true,
		oneofs: true
	})
);

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

	// TODO: Fix this (can't be fixed)
	public rpc: any;
	public rpcHandler!: RPCHandler;
	public patrons!: Patrons;
	public automaton!: Automaton;
	public components = new Map<string, Snowflake[]>();
	public resolver!: Resolver;
	public ownerId: string;

	public constructor() {
		super({
			intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_WEBHOOKS, Intents.FLAGS.GUILD_MESSAGES]
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
		const uniqueId = uuid.v4();
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

		this.settings = new SettingsProvider(this.db);
		await this.settings.init();

		this.storage = new StorageHandler(this);
		this.rpcHandler = new RPCHandler(this);

		this.patrons = new Patrons(this);
		await this.patrons.refresh();

		this.automaton = new Automaton(this);
		this.stats = new StatsHandler(this);
		this.resolver = new Resolver(this);
		this.remindScheduler = new RemindScheduler(this);

		await this.http.login();

		// @ts-expect-error
		this.rpc = new Route.RouteGuide(process.env.SERVER, gRPC.credentials.createInsecure());

		this.once('ready', () => {
			if (process.env.NODE_ENV === 'production') return this.run();
		});

		return this.login(token);
	}
}

export default Client;
