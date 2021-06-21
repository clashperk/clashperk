import { AkairoClient, CommandHandler, ListenerHandler, InhibitorHandler, Flag, Command } from 'discord-akairo';
import { APIApplicationCommandInteractionDataOption, APIInteraction } from 'discord-api-types/v8';
import Interaction, { InteractionParser } from './Interaction';
import { MessageEmbed, Message, Intents } from 'discord.js';
import { loadSync } from '@grpc/proto-loader';
import RPCHandler from '../core/RPCHandler';
import Settings from './SettingsProvider';
import { Connection } from './Database';
import Storage from './StorageHandler';
import * as gRPC from '@grpc/grpc-js';
import Logger from '../util/Logger';
import Stats from './StatsHandler';
import Resolver from './Resolver';
import Patrons from './Patrons';
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
	public rpcHandler!: RPCHandler;
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
		super({
			ownerID: config.owner,
			messageCacheMaxSize: 10,
			messageCacheLifetime: 150,
			messageSweepInterval: 150,
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_WEBHOOKS,
				Intents.FLAGS.GUILD_MESSAGES,
				Intents.FLAGS.GUILD_MESSAGE_REACTIONS
			]
		});

		this.ws.on('INTERACTION_CREATE', async (res: APIInteraction) => {
			if (!res.member) return; // eslint-disable-line
			if (res.type === 1) return;
			// if (res.type === 3) await this.api.channels[res.channel_id].messages[res.message.id].delete(); // eslint-disable-line
			const interaction = await new Interaction(this, res).parse(res);

			// @ts-expect-error
			const alias = res.type === 2 ? [res.data!.name] : res.data.custom_id.split(/ +/g); // eslint-disable-line
			const command = this.commandHandler.findCommand(alias[0]);
			if (!command) return; // eslint-disable-line

			if (!interaction.channel.permissionsFor(this.user!)!.has(['SEND_MESSAGES', 'VIEW_CHANNEL'])) {
				const perms = interaction.channel.permissionsFor(this.user!)!.missing(['SEND_MESSAGES', 'VIEW_CHANNEL'])
					.map(perm => {
						if (perm === 'VIEW_CHANNEL') return 'Read Messages';
						return perm.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase());
					});

				// @ts-expect-error
				return this.api.interactions(res.id, res.token).callback.post({
					data: {
						type: 4,
						data: {
							content: `Missing **${perms.join('** and **')}** permission${perms.length > 1 ? 's' : ''}.`,
							flags: 64
						}
					}
				});
			}

			const flags = ['help', 'invite', 'stats', 'guide'].includes(command.id) ? 64 : 0;
			// @ts-expect-error
			await this.api.interactions(res.id, res.token).callback.post({ data: { type: 5, data: { flags } } });
			// eslint-disable-next-line
			return this.handleInteraction(interaction, command, res.type === 2 ? interaction.options : alias.slice(1).join(' '));
		});
	}

	private contentParser(command: Command, content: string | APIApplicationCommandInteractionDataOption[]) {
		if (Array.isArray(content)) {
			// @ts-expect-error
			const contentParser = new InteractionParser({ flagWords: command.contentParser.flagWords, optionFlagWords: command.contentParser.optionFlagWords });
			return contentParser.parse(content);
		}
		// @ts-expect-error
		return command.contentParser.parse(content);
	}

	private async handleInteraction(interaction: Interaction, command: Command, content: string | APIApplicationCommandInteractionDataOption[], ignore = false): Promise<any> {
		if (!ignore) {
			// @ts-expect-error
			if (await this.commandHandler.runPostTypeInhibitors(interaction, command)) return;
		}
		const parsed = this.contentParser(command, content);
		// @ts-expect-error
		const args = await command.argumentRunner.run(interaction, parsed, command.argumentGenerator);
		if (Flag.is(args, 'cancel')) {
			return this.commandHandler.emit('commandCancelled', interaction, command);
		} else if (Flag.is(args, 'continue')) {
			const continueCommand = this.commandHandler.modules.get(args.command)!;
			return this.handleInteraction(interaction, continueCommand, args.rest, args.ignore);
		}

		// @ts-expect-error
		return this.commandHandler.runCommand(interaction, command, args);
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

		this.once('ready', () => {
			if (process.env.NODE_ENV === 'production') return this.run();
		});
	}

	public embed(message: Message) {
		return this.settings.get<number>(message.guild!, 'color', undefined);
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
