import { Settings } from '@app/constants';
import {
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  BaseInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  Collection,
  CommandInteraction,
  CommandInteractionOption,
  Events,
  GuildBasedChannel,
  Interaction,
  Message,
  MessageComponentInteraction,
  MessageContextMenuCommandInteraction,
  MessageFlags,
  PermissionsString,
  RestEvents,
  User,
  UserContextMenuCommandInteraction
} from 'discord.js';
import EventEmitter from 'node:events';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import readdirp from 'readdirp';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { CustomIdProps } from '../struct/component-handler.js';
import { i18n } from '../util/i18n.js';
import './modifier.js';
import {
  BuiltInReasons,
  CommandEvents,
  CommandHandlerEvents,
  resolveColorCode,
  WSEvents
} from './util.js';

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

class BaseHandler extends EventEmitter {
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
    for await (const dir of readdirp(this.directory, {
      fileFilter: ({ basename }) => basename.endsWith('.js')
    })) {
      if (extname(dir.path) !== '.js') continue;
      const mod = container.resolve<Command | Listener | Inhibitor>(
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
  declare public modules: Collection<string, Command>;

  public constructor(
    public client: Client,
    { directory }: { directory: string }
  ) {
    super(client, { directory });

    container.register(CommandHandler, { useValue: this });
    this.aliases = new Collection();

    client.on(Events.InteractionCreate, (interaction: Interaction) => {
      if (interaction.isChatInputCommand()) {
        return this.handleInteraction(interaction);
      }
      if (interaction.isContextMenuCommand()) {
        return this.handleContextInteraction(interaction);
      }
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

  public handleInteraction(interaction: ChatInputCommandInteraction) {
    let command = this.getCommand(interaction.commandName);

    if (!command) {
      const rawArgs = this.rawArgs(interaction);
      command = this.getCommand(rawArgs.commandName as string);
    }

    if (!command) return;

    const args = this.argumentRunner(interaction, command);
    if (this.preInhibitor(interaction, command, args)) return;

    return this.exec(interaction, command, args);
  }

  private async handleContextInteraction(
    interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction
  ) {
    const command = this.getCommand(interaction.commandName);
    if (!command) return;

    const args: Record<string, string | User> = {};
    if (interaction.isMessageContextMenuCommand()) {
      const message = interaction.options.getMessage('message');
      if (message) {
        args.message = message.content;
        args.url = message.url;
      }
    } else {
      const user = interaction.options.getUser('user');
      if (user) args.user = user;
    }

    if (this.preInhibitor(interaction, command, args)) return;

    return this.exec(interaction, command, args);
  }

  public getCommand(commandName: string): Command | null {
    const alias = this.aliases.get(commandName);
    if (!alias) return null;

    const command = this.modules.get(alias);
    if (!command) return null;

    if (command) {
      command.resolvedId = alias;
      command.options.resolvedId = alias;
    }

    return command;
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

  public rawArgs(interaction: ChatInputCommandInteraction | AutocompleteInteraction) {
    const resolved: Record<string, unknown> = {};
    for (const [name, option] of Object.entries(
      this.transformInteraction(interaction.options.data)
    )) {
      const key = name.toString();

      if (
        [
          ApplicationCommandOptionType.Subcommand,
          ApplicationCommandOptionType.SubcommandGroup
        ].includes(option.type)
      ) {
        resolved[key] = option.name;
      } else if (option.type === ApplicationCommandOptionType.Channel) {
        resolved[key] = (option.channel as GuildBasedChannel | null)?.isTextBased()
          ? option.channel
          : null;
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

      if (
        resolved[key] &&
        (typeof resolved[key] === 'boolean' || ['true', 'false'].includes(resolved[key] as string))
      ) {
        resolved[key] = resolved[key] === 'true' || resolved[key] === true;
      }

      if (resolved[key] && name === 'color') {
        resolved[key] = resolveColorCode(resolved[key] as string);
      }
    }

    const subCommandGroup = resolved.subCommand ? `-${resolved.subCommand as string}` : '';
    const subCommand = resolved.command ? `-${resolved.command as string}` : '';
    resolved.commandName = `${interaction.commandName}${subCommandGroup}${subCommand}`;

    return resolved;
  }

  public argumentRunner(
    interaction: ChatInputCommandInteraction | AutocompleteInteraction,
    command: Command
  ) {
    const args = command.args(interaction);

    const resolved: Record<string, unknown> = {};
    for (const [name, option] of Object.entries(
      this.transformInteraction(interaction.options.data)
    )) {
      const key = (args[name]?.id ?? name).toString(); // KEY_OVERRIDE

      if (
        [
          ApplicationCommandOptionType.Subcommand,
          ApplicationCommandOptionType.SubcommandGroup
        ].includes(option.type)
      ) {
        resolved[key] = option.name; // SUB_COMMAND OR SUB_COMMAND_GROUP
      } else if (option.type === ApplicationCommandOptionType.Channel) {
        resolved[key] = (option.channel as GuildBasedChannel | null)?.isTextBased()
          ? option.channel
          : null;
      } else if (option.type === ApplicationCommandOptionType.Role) {
        resolved[key] = option.role ?? null;
      } else if (option.type === ApplicationCommandOptionType.Mentionable) {
        resolved[key] = option.user ?? option.role ?? null;
      } else if (option.type === ApplicationCommandOptionType.User) {
        resolved[key] =
          args[name]?.match === 'MEMBER' ? (option.member ?? null) : (option.user ?? null);
      } else if (option.type === ApplicationCommandOptionType.Attachment) {
        resolved[key] = option.attachment?.url ?? null;
      } else {
        resolved[key] = option.value ?? null;
      }

      if (
        resolved[key] &&
        (args[name]?.match === 'BOOLEAN' || resolved[key] === 'true' || resolved[key] === 'false')
      ) {
        resolved[key] = typeof resolved[key] === 'boolean' || resolved[key] === 'true';
      }

      if (resolved[key] && args[name]?.match === 'COLOR') {
        resolved[key] = resolveColorCode(resolved[key] as string);
      }

      if (resolved[key] && args[name]?.match === 'ENUM') {
        const value = resolved[key] as string;
        const flatten = args[name]?.enums?.find((text) =>
          Array.isArray(text) ? text.includes(value) : text === value
        );
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

  /** This method should only be used with CommandInteraction */
  public continue(interaction: CommandInteraction | MessageComponentInteraction, command: Command) {
    const args = this.argumentRunner(interaction as ChatInputCommandInteraction, command);
    if (this.preInhibitor(interaction, command, args)) return;
    return this.exec(interaction, command, args);
  }

  public async exec(
    interaction: CommandInteraction | MessageComponentInteraction,
    command: Command,
    args: Record<string, unknown> = {}
  ) {
    try {
      const options = command.refine(interaction, args);

      if (options.defer && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply(options.ephemeral ? { flags: MessageFlags.Ephemeral } : {});
      }
      this.emit(CommandHandlerEvents.COMMAND_STARTED, interaction, command, args);
      await command.exec(interaction, args);
    } catch (error) {
      this.emit(CommandHandlerEvents.ERROR, error, interaction, command);
    } finally {
      this.emit(CommandHandlerEvents.COMMAND_ENDED, interaction, command, args);
    }
  }

  public preInhibitor(
    interaction: BaseInteraction,
    command: Command,
    args: Record<string, unknown>
  ) {
    const options = command.refine(interaction, args);

    const reason = this.client.inhibitorHandler.run(interaction, command);
    if (reason) {
      this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, reason);
      return true;
    }

    const isOwner = this.client.isOwner(interaction.user);
    if (options.ownerOnly && !isOwner) {
      this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, BuiltInReasons.OWNER);
      return true;
    }

    if (options.channel === 'guild' && !interaction.guild) {
      this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, BuiltInReasons.GUILD);
      return true;
    }

    // if (options.channel === 'dm' && interaction.guild) {
    // 	this.emit(CommandHandlerEvents.COMMAND_BLOCKED, interaction, command, BuiltInReasons.DM);
    // 	return true;
    // }

    return this.runPermissionChecks(interaction, command, options);
  }

  private runPermissionChecks(
    interaction: BaseInteraction,
    command: Command,
    options: CommandOptions
  ) {
    if (!interaction.inCachedGuild()) return false;

    if (options.clientPermissions?.length) {
      const missing = interaction.appPermissions.missing(options.clientPermissions);
      if (missing.length) {
        this.emit(
          CommandHandlerEvents.MISSING_PERMISSIONS,
          interaction,
          command,
          BuiltInReasons.CLIENT,
          missing
        );
        return true;
      }
    }

    const [isValidWhitelist, isWhitelisted] = this.checkWhitelist(interaction, options);
    if (isValidWhitelist && isWhitelisted) return false;

    const isManager = this.client.util.isManager(interaction.member, options.roleKey);

    if (!isManager && options.userPermissions?.length) {
      const missing = interaction.channel
        ?.permissionsFor(interaction.user)
        ?.missing(options.userPermissions);
      if (missing?.length) {
        this.emit(
          CommandHandlerEvents.MISSING_PERMISSIONS,
          interaction,
          command,
          BuiltInReasons.USER,
          missing
        );
        return true;
      }
    }

    if (isManager) return false;

    if (isValidWhitelist && !isWhitelisted) {
      this.emit(
        CommandHandlerEvents.COMMAND_BLOCKED,
        interaction,
        command,
        BuiltInReasons.WHITELIST
      );
      return true;
    }

    return false;
  }

  public checkWhitelist(interaction: BaseInteraction, options: CommandOptions): [boolean, boolean] {
    if (!interaction.inCachedGuild()) return [false, false];
    if (!interaction.isCommand()) return [false, false];

    if (!options.resolvedId) return [false, false];

    const commandWhitelist = this.client.settings.get<
      { key: string; userOrRoleId: string; commandId: string; isRole: boolean }[]
    >(interaction.guild, Settings.COMMAND_WHITELIST, []);
    if (!commandWhitelist.length) return [false, false];

    const whitelisted = commandWhitelist.filter(
      (whitelist) => whitelist.commandId === options.resolvedId
    );
    if (!whitelisted.length) return [false, false];

    const authorized = whitelisted.find(({ userOrRoleId }) => {
      return (
        interaction.member.roles.cache.has(userOrRoleId) || interaction.user.id === userOrRoleId
      );
    });

    return [true, !!authorized];
  }
}

export class ListenerHandler extends BaseHandler {
  declare public modules: Collection<string, Listener>;
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
    if (!emitter) return;

    if (listener.once) {
      emitter.once(listener.event, listener.exec.bind(listener));
    } else {
      emitter.on(listener.event, listener.exec.bind(listener));
    }
  }
}

export class InhibitorHandler extends BaseHandler {
  declare public modules: Collection<string, Inhibitor>;

  public constructor(client: Client, { directory }: { directory: string }) {
    super(client, { directory });

    container.register(InhibitorHandler, { useValue: this });
  }

  public run(interaction: BaseInteraction, command: Command) {
    try {
      const inhibitor = this.modules
        .sort((a, b) => b.priority - a.priority)
        .filter((inhibitor) => !inhibitor.disabled && inhibitor.exec(interaction, command))
        .at(0);
      return inhibitor?.reason ?? null;
    } catch (error) {
      this.emit(CommandHandlerEvents.ERROR, error, interaction, command);
    }

    return null;
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
  roleKey?: string | null;
  resolvedId?: string;
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
  public roleKey?: string | null;
  public resolvedId?: string;

  public handler: CommandHandler;
  public i18n = i18n;
  public options: CommandOptions;

  public constructor(id: string, options: CommandOptions) {
    const {
      defer,
      aliases,
      ephemeral,
      userPermissions,
      clientPermissions,
      channel,
      ownerOnly,
      category,
      roleKey
    } = options;
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
    this.options = options;
  }

  public autocomplete(
    interaction: AutocompleteInteraction,
    args: Record<string, unknown>
  ): Promise<unknown> | unknown;
  public autocomplete(): Promise<unknown> | unknown {
    return null;
  }

  public refine(interaction: BaseInteraction, args: Record<string, unknown>): CommandOptions;
  public refine(): CommandOptions {
    return this.options;
  }

  public args(interaction?: BaseInteraction): Args;
  public args(): Args {
    return {};
  }

  public exec(
    interaction: CommandInteraction | MessageComponentInteraction,
    args: unknown
  ): Promise<unknown> | unknown;
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
  disabled?: boolean;
}

export class Inhibitor implements InhibitorOptions {
  public id: string;
  public reason: string;
  public category?: string;
  public priority: number;
  public handler: InhibitorHandler;
  public client: Client;
  public disabled: boolean;
  public i18n = i18n;

  public constructor(id: string, { category, priority, reason, disabled }: InhibitorOptions) {
    this.id = id;
    this.reason = reason;
    this.category = category;
    this.priority = priority ?? 0;
    this.disabled = disabled ?? false;
    this.client = container.resolve(Client);
    this.handler = container.resolve(InhibitorHandler);
  }

  public exec(interaction: BaseInteraction, command: Command): boolean;
  public exec(): boolean {
    throw Error('This method needs to be overwritten inside of an actual inhibitor.');
  }
}
