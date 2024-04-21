import {
	ApplicationCommandOptionType,
	AutocompleteInteraction,
	BaseInteraction,
	ClientEvents,
	Collection,
	CommandInteraction,
	CommandInteractionOption,
	EmbedBuilder,
	Events,
	GuildBasedChannel,
	Interaction,
	Message,
	MessageComponentInteraction,
	PermissionFlagsBits,
	PermissionsString,
	RestEvents
} from 'discord.js';
import EventEmitter from 'node:events';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import readdirp from 'readdirp';
import { container } from 'tsyringe';
import { Client } from '../struct/Client.js';
import { CustomIdProps } from '../struct/ComponentHandler.js';
import { Settings } from '../util/Constants.js';
import { i18n } from '../util/i18n.js';
import { BuiltInReasons, CommandEvents, CommandHandlerEvents, ResolveColor, WSEvents } from './util.js';

type ArgsMatchType =
	| 'SUB_COMMAND'
	| 'SUB_COMMAND_GROUP'
	| 'STRING'
	| 'INTEGER'
	| 'BOOLEAN'
	| 'USER'
	| 'MEMBER'
	| 'CHANNEL'
	| 'ROLE'
	| 'MENTIONABLE'
	| 'NUMBER'
	| 'COLOR'
	| 'ENUM';

export type Args = Record<
	string,
	{
		id?: string;
		match: ArgsMatchType;
		enums?: (string | string[])[];
		default?: unknown | ((value: unknown) => unknown);
	} | null
>;

export class BaseHandler extends EventEmitter {
	public readonly directory: string;
	public readonly modules: Collection<string, Command | Listener | Inhibitor>;

	public constructor(
		public client: Client,
		{ directory }: { directory: string }
	) {
		super();

		this.directory = directory;
		this.modules = new Collection();
	}

	public async register() {
		for await (const dir of readdirp(this.directory, { fileFilter: '*.js' })) {
			if (extname(dir.path) !== '.js') continue;
			const mod = container.resolve<Command | Listener | Inhibitor>(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(await import(pathToFileURL(dir.fullPath).href)).default
			);
			this.construct(mod);
		}
	}

	public construct(mod: Command | Listener | Inhibitor) {
		if (this.modules.has(mod.id)) {
			throw new Error(`Module "${mod.id}" already exists.`);
		}
		this.modules.set(mod.id, mod);
	}
}

export class CommandHandler extends BaseHandler {
	public readonly aliases: Collection<string, string>;
	public declare modules: Collection<string, Command>;

	public constructor(
		public client: Client,
		{ directory }: { directory: string }
	) {
		super(client, { directory });

		container.register(CommandHandler, { useValue: this });
		this.aliases = new Collection();

		client.on(Events.InteractionCreate, (interaction: Interaction) => {
			if (!interaction.isChatInputCommand()) return;
			return this.handleInteraction(interaction);
		});
	}

	public override construct(command: Command) {
		super.construct(command);
		const aliases = new Set([command.id, ...(command.aliases ?? [])]);
		for (const alias of aliases) {
			if (this.aliases.has(alias)) {
				throw new Error(`Command "${command.id}" already exists.`);
			}
			this.aliases.set(alias, command.id);
		}
	}

	public getCommand(alias: string): Command | null {
		return this.modules.get(alias) ?? this.modules.get(this.aliases.get(alias)!) ?? null;
	}

	public transformInteraction(
		options: readonly CommandInteractionOption[],
		result: Record<string, CommandInteractionOption> = {}
	): Record<string, CommandInteractionOption> {
		for (const option of options) {
			if ([ApplicationCommandOptionType.SubcommandGroup].includes(option.type)) {
				result.subCommand = option;
				return this.transformInteraction([...(option.options ?? [])], result);
			}
			if ([ApplicationCommandOptionType.Subcommand].includes(option.type)) {
				result.command = option;
				return this.transformInteraction([...(option.options ?? [])], result);
			}
			result[option.name] = option;
		}

		return result;
	}

	public rawArgs(interaction: CommandInteraction | AutocompleteInteraction) {
		const resolved: Record<string, unknown> = {};
		for (const [name, option] of Object.entries(this.transformInteraction(interaction.options.data))) {
			const key = name.toString();

			if ([ApplicationCommandOptionType.Subcommand, ApplicationCommandOptionType.SubcommandGroup].includes(option.type)) {
				resolved[key] = option.name;
			} else if (option.type === ApplicationCommandOptionType.Channel) {
				resolved[key] = (option.channel as GuildBasedChannel | null)?.isTextBased() ? option.channel : null;
			} else if (option.type === ApplicationCommandOptionType.Role) {
				resolved[key] = option.role ?? null;
			} else if (option.type === ApplicationCommandOptionType.User) {
				resolved[key] = option.user ?? null;
			} else if (option.type === ApplicationCommandOptionType.Mentionable) {
				resolved[key] = option.user ?? option.role ?? null;
			} else if (option.type === ApplicationCommandOptionType.Attachment) {
				resolved[key] = option.attachment?.url ?? null;
			} else {
				resolved[key] = option.value ?? null;
			}

			if (resolved[key] && (typeof resolved[key] === 'boolean' || ['true', 'false'].includes(resolved[key] as string))) {
				resolved[key] = resolved[key] === 'true' || resolved[key] === true;
			}

			if (resolved[key] && name === 'color') {
				resolved[key] = ResolveColor(resolved[key] as string);
			}
		}

		const subCommandGroup = resolved.subCommand ? `-${resolved.subCommand as string}` : '';
		const subCommand = resolved.command ? `-${resolved.command as string}` : '';
		resolved.commandName = `${interaction.commandName}${subCommandGroup}${subCommand}`;

		return resolved;
	}

	public argumentRunner(interaction: CommandInteraction | AutocompleteInteraction, command: Command) {
		const args = command.args(interaction);

		const resolved: Record<string, unknown> = {};
		for (const [name, option] of Object.entries(this.transformInteraction(interaction.options.data))) {
			const key = (args[name]?.id ?? name).toString(); // KEY_OVERRIDE

			if ([ApplicationCommandOptionType.Subcommand, ApplicationCommandOptionType.SubcommandGroup].includes(option.type)) {
				resolved[key] = option.name; // SUB_COMMAND OR SUB_COMMAND_GROUP
			} else if (option.type === ApplicationCommandOptionType.Channel) {
				resolved[key] = (option.channel as GuildBasedChannel | null)?.isTextBased() ? option.channel : null;
			} else if (option.type === ApplicationCommandOptionType.Role) {
				resolved[key] = option.role ?? null;
			} else if (option.type === ApplicationCommandOptionType.Mentionable) {
				resolved[key] = option.user ?? option.role ?? null;
			} else if (option.type === ApplicationCommandOptionType.User) {
				resolved[key] = args[name]?.match === 'MEMBER' ? option.member ?? null : option.user ?? null;
			} else if (option.type === ApplicationCommandOptionType.Attachment) {
				resolved[key] = option.attachment?.url ?? null;
			} else {
				resolved[key] = option.value ?? null;
			}

			if (resolved[key] && (args[name]?.match === 'BOOLEAN' || resolved[key] === 'true' || resolved[key] === 'false')) {
				resolved[key] = typeof resolved[key] === 'boolean' || resolved[key] === 'true';
			}

			if (resolved[key] && args[name]?.match === 'COLOR') {
				resolved[key] = ResolveColor(resolved[key] as string);
			}

			if (resolved[key] && args[name]?.match === 'ENUM') {
				const value = resolved[key] as string;
				const flatten = args[name]?.enums?.find((text) => (Array.isArray(text) ? text.includes(value) : text === value));
				resolved[key] = flatten ? (Array.isArray(flatten) ? flatten.at(0)! : flatten) : null;
			}

			if (!resolved[key] && args[name]?.default) {
				const def = args[name]?.default;
				resolved[key] = typeof def === 'function' ? def(resolved[key]) : def;
			}
		}

		for (const [name, option] of Object.entries(args)) {
			const key = (option?.id ?? name).toString(); // KEY_OVERRIDE
			if (key in resolved) continue;

			if (option?.default) {
				const def = option.default;
				resolved[key] = typeof def === 'function' ? def(resolved[key]) : def;
			}
		}

		const subCommandGroup = resolved.subCommand ? `-${resolved.subCommand as string}` : '';
		const subCommand = resolved.command ? `-${resolved.command as string}` : '';
		resolved.commandName = `${interaction.commandName}${subCommandGroup}${subCommand}`;

		return resolved;
	}

	public handleInteraction(interaction: CommandInteraction) {
		const command = this.getCommand(interaction.commandName);
		if (!command) return this.handleSubCommandInteraction(interaction);

		if (this.preInhibitor(interaction, command)) return;

		const args = this.argumentRunner(interaction, command);
		return this.exec(interaction, command, args);
	}

	private handleSubCommandInteraction(interaction: CommandInteraction) {
		const rawArgs = this.rawArgs(interaction);

		const command = this.getCommand(rawArgs.commandName as string);
		if (!command) return;

		if (this.preInhibitor(interaction, command)) return;

		const args = this.argumentRunner(interaction, command);
		return this.exec(interaction, command, args);
	}

	public continue(interaction: CommandInteraction | MessageComponentInteraction, command: Command) {
		if (this.preInhibitor(interaction, command)) return;
		const args = this.argumentRunner(interaction as CommandInteraction, command);
		return this.exec(interaction, command, args);
	}

	public async exec(interaction: CommandInteraction | MessageComponentInteraction, command: Command, args: Record<string, unknown> = {}) {
		if (await this.postInhibitor(interaction, command)) return;
		try {
			await command.pre(interaction, args);
			await command.permissionCheck(interaction);

			if (command.defer && !interaction.deferred && !interaction.replied) {
				await interaction.deferReply({ ephemeral: this.isMessagingDisabled(interaction) || command.ephemeral });
			}
			this.emit(CommandHandlerEvents.COMMAND_STARTED, interaction, command, args);
			await command.exec(interaction, args);
		} catch (error) {
			this.emit(CommandHandlerEvents.ERROR, error, interaction, command);
		} finally {
			this.emit(CommandHandlerEvents.COMMAND_ENDED, interaction, command, args);
		}
	}

	public isMessagingDisabled(interaction: CommandInteraction | MessageComponentInteraction) {
		if (!interaction.inGuild()) return false;
		if (!interaction.inCachedGuild()) return true;

		if (interaction.channel?.isThread()) {
			return !interaction.appPermissions.has([PermissionFlagsBits.SendMessagesInThreads]);
		}

		return !interaction.appPermissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]);
	}

	public async postInhibitor(interaction: CommandInteraction | MessageComponentInteraction, command: Command) {
		const passed = command.condition(interaction);
		if (!passed) return false;

		this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, BuiltInReasons.POST);
		if (interaction.replied) {
			await interaction.followUp({ ...passed, ephemeral: true });
		} else {
			await interaction.reply({ ...passed, ephemeral: true });
		}
		return true;
	}

	public preInhibitor(interaction: BaseInteraction, command: Command) {
		const reason = this.client.inhibitorHandler.run(interaction, command);
		if (reason) {
			this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, reason);
			return true;
		}

		const isOwner = this.client.isOwner(interaction.user);
		if (command.ownerOnly && !isOwner) {
			this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, BuiltInReasons.OWNER);
			return true;
		}

		if (command.channel === 'guild' && !interaction.guild) {
			this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, BuiltInReasons.GUILD);
			return true;
		}

		// if (command.channel === 'dm' && interaction.guild) {
		// 	this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, BuiltInReasons.DM);
		// 	return true;
		// }

		return this.runPermissionChecks(interaction, command);
	}

	private runPermissionChecks(interaction: BaseInteraction, command: Command) {
		if (!interaction.inCachedGuild()) return false;

		if (command.clientPermissions?.length) {
			const missing = interaction.appPermissions.missing(command.clientPermissions);
			if (missing.length) {
				this.emit(CommandHandlerEvents.MISSING_PERMISSIONS, interaction, command, BuiltInReasons.CLIENT, missing);
				return true;
			}
		}

		if (command.userPermissions?.length) {
			const missing = interaction.channel?.permissionsFor(interaction.user)?.missing(command.userPermissions);

			const managerRole = interaction.guild.roles.cache.get(
				this.client.settings.get<string>(interaction.guild, Settings.MANAGER_ROLE, null)
			);
			if (managerRole && interaction.member.roles.cache.has(managerRole.id)) return false;

			if (command.roleKey) {
				const role = interaction.guild.roles.cache.get(this.client.settings.get<string>(interaction.guild, command.roleKey, null));
				if (role && interaction.member.roles.cache.has(role.id)) return false;
			}

			if (missing?.length) {
				this.emit(CommandHandlerEvents.MISSING_PERMISSIONS, interaction, command, BuiltInReasons.USER, missing);
				return true;
			}
		}

		return false;
	}
}

export class ListenerHandler extends BaseHandler {
	public declare modules: Collection<string, Listener>;
	private readonly emitters: Collection<string, EventEmitter>;

	public constructor(client: Client, { directory }: { directory: string }) {
		super(client, { directory });

		this.emitters = new Collection();
		container.register(ListenerHandler, { useValue: this });
	}

	public override construct(listener: Listener) {
		super.construct(listener);
		return this.addToEmitter(listener.id);
	}

	public addToEmitter(name: string) {
		const listener = this.modules.get(name)!;

		const emitter = {
			client: this.client as unknown as EventEmitter,
			commandHandler: this.client.commandHandler,
			rest: this.client.rest as unknown as EventEmitter,
			ws: this.client.ws as unknown as EventEmitter
		}[listener.emitter];
		if (!emitter) return; // eslint-disable-line

		if (listener.once) {
			emitter.once(listener.event, listener.exec.bind(listener));
		} else {
			emitter.on(listener.event, listener.exec.bind(listener));
		}
	}
}

export class InhibitorHandler extends BaseHandler {
	public declare modules: Collection<string, Inhibitor>;

	public constructor(client: Client, { directory }: { directory: string }) {
		super(client, { directory });

		container.register(InhibitorHandler, { useValue: this });
	}

	public run(interaction: BaseInteraction, command: Command) {
		try {
			const inhibitor = this.modules
				.sort((a, b) => b.priority - a.priority)
				.filter((inhibitor) => inhibitor.exec(interaction, command))
				.at(0);
			return inhibitor?.reason ?? null;
		} catch (error) {
			this.emit(CommandHandlerEvents.ERROR, error, interaction, command);
		}
	}
}

export interface CommandOptions {
	aliases?: string[];
	category?: string;
	ownerOnly?: boolean;
	ephemeral?: boolean;
	channel?: 'dm' | 'guild';
	defer: boolean;
	userPermissions?: PermissionsString[];
	clientPermissions?: PermissionsString[];
	roleKey?: string;
}

export class Command implements CommandOptions {
	public id: string;
	public aliases?: string[];
	public client: Client;
	public category: string;
	public ephemeral?: boolean;
	public ownerOnly?: boolean;
	public channel?: 'dm' | 'guild';
	public defer: boolean;
	public userPermissions?: PermissionsString[];
	public clientPermissions?: PermissionsString[];
	public roleKey?: string;
	public muted?: boolean;

	public handler: CommandHandler;
	public i18n = i18n;

	public constructor(
		id: string,
		{ defer, aliases, ephemeral, userPermissions, clientPermissions, channel, ownerOnly, category, roleKey }: CommandOptions
	) {
		this.id = id;
		this.aliases = aliases;
		this.defer = defer;
		this.ephemeral = ephemeral;
		this.userPermissions = userPermissions;
		this.clientPermissions = clientPermissions;
		this.roleKey = roleKey;
		this.channel = channel;
		this.ownerOnly = ownerOnly;
		this.category = category ?? 'default';
		this.client = container.resolve(Client);
		this.handler = container.resolve(CommandHandler);
	}

	public autocomplete(interaction: AutocompleteInteraction, args: Record<string, unknown>): Promise<unknown> | unknown;
	public autocomplete(): Promise<unknown> | unknown {
		return null;
	}

	public condition(interaction: BaseInteraction): { embeds: EmbedBuilder[] } | null;
	public condition(): { embeds: EmbedBuilder[] } | null {
		return null;
	}

	public async permissionCheck(interaction: CommandInteraction | MessageComponentInteraction) {
		this.muted = this.handler.isMessagingDisabled(interaction);
	}

	public pre(interaction: BaseInteraction, args: Record<string, unknown>): Promise<unknown>;
	public pre(): Promise<unknown> {
		return Promise.resolve();
	}

	public args(interaction?: BaseInteraction): Args;
	public args(): Args {
		return {};
	}

	public exec(interaction: CommandInteraction | MessageComponentInteraction, args: unknown): Promise<unknown> | unknown;
	public exec(): Promise<unknown> | unknown {
		throw Error('This method needs to be overwritten inside of an actual command.');
	}

	/** For owner-only text-based commands. */
	public run(message: Message, args: unknown): Promise<unknown> | unknown;
	public run(): Promise<unknown> | unknown {
		return null;
	}

	public createId(payload: CustomIdProps) {
		return this.client.redis.createCustomId(payload);
	}
}

export interface ListenerOptions {
	emitter: 'client' | 'commandHandler' | 'rest' | 'ws';
	category?: string;
	once?: boolean;
	event: keyof ClientEvents | keyof CommandEvents | keyof RestEvents | keyof WSEvents;
}

export class Listener implements ListenerOptions {
	public id: string;
	public emitter: 'client' | 'commandHandler' | 'rest' | 'ws';
	public category?: string;
	public event: keyof ClientEvents | keyof CommandEvents | keyof RestEvents | keyof WSEvents;
	public once?: boolean;
	public handler: ListenerHandler;
	public client: Client;
	public i18n = i18n;

	public constructor(id: string, { emitter, event, once }: ListenerOptions) {
		this.id = id;
		this.event = event;
		this.once = once;
		this.emitter = emitter;
		this.client = container.resolve(Client);
		this.handler = container.resolve(ListenerHandler);
	}

	public exec(...args: any[]): Promise<unknown> | unknown;
	public exec(): Promise<unknown> | unknown {
		throw Error('This method needs to be overwritten inside of an actual listener.');
	}
}

export interface InhibitorOptions {
	category?: string;
	priority?: number;
	reason: string;
}

export class Inhibitor implements InhibitorOptions {
	public id: string;
	public reason: string;
	public category?: string;
	public priority: number;
	public handler: InhibitorHandler;
	public client: Client;
	public i18n = i18n;

	public constructor(id: string, { category, priority, reason }: InhibitorOptions) {
		this.id = id;
		this.reason = reason;
		this.category = category;
		this.priority = priority ?? 0;
		this.client = container.resolve(Client);
		this.handler = container.resolve(InhibitorHandler);
	}

	public exec(interaction: BaseInteraction, command: Command): boolean;
	public exec(): boolean {
		throw Error('This method needs to be overwritten inside of an actual inhibitor.');
	}
}
