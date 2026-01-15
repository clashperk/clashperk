import { Settings } from '@app/constants';
import { Message, PermissionFlagsBits } from 'discord.js';
import { Command, Listener } from '../../lib/handlers.js';

const IN_GAME_REGEX = /\bhttps:\/\/link\.clashofclans\.com\S+/gi;

// const SHORT_LINK_REGEX = /\bhttps?:\/\/cprk\.us\S+/gi;

// https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=

// https://link.clashofclans.com/en?action=OpenClanProfile&tag=

// https://link.clashofclans.com/en?action=SupportCreator&id=

// https://link.clashofclans.com/en?action=OpenMoreSettings

// https://link.clashofclans.com/en?action=openhelpshift

// https://link.clashofclans.com/en?action=OpenLayout&id=

// https://link.clashofclans.com/en?action=CopyArmy&army=

export default class MessageCreateListener extends Listener {
  public constructor() {
    super('messageCreate', {
      event: 'messageCreate',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec(message: Message) {
    if (!message.inGuild()) return;
    if (message.author.bot) return;

    if (this.inhibitor(message)) return;

    if (
      message.channel.isThread() &&
      !message.channel
        .permissionsFor(this.client.user)
        ?.has(PermissionFlagsBits.SendMessagesInThreads)
    )
      return;

    if (
      !message.channel
        .permissionsFor(this.client.user)
        ?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel])
    )
      return;

    if (IN_GAME_REGEX.test(message.content)) {
      return this.linkParser(message);
    }

    const parsed = [`<@${this.client.user.id}>`, `<@!${this.client.user.id}>`]
      .map((mention) => this.parseWithPrefix(message.content, mention))
      .find((_) => _);
    if (!parsed) return;

    const { command, content, contents } = parsed;
    if (!command) return;

    const resolved: Record<string, string> = {};
    const args = command.args();
    const keys = Object.keys(args);
    keys.forEach((key, idx) => (resolved[key] = contents[idx]));
    if (!keys.length) resolved.message = content;

    return this.executeCommand(message, command, resolved);
  }

  private async executeCommand(
    message: Message<true>,
    command: Command,
    args: Record<string, string>
  ) {
    if (command.ownerOnly && !this.client.isOwner(message.author.id)) {
      this.client.logger.log(`${command.id} ~ text-command`, {
        label: `${message.guild.name}/${message.author.displayName}`
      });
      return;
    }

    try {
      this.client.logger.log(`${command.id}`, {
        label: `${message.guild.name}/${message.author.displayName}`
      });
      await command.run(message, args);
    } catch (error) {
      this.client.logger.error(`${command.id} ~ ${error.message}`, {
        label: `${message.guild.name}/${message.author.displayName}`
      });
      await message.channel.send('**Something went wrong while executing this command.**');
    }
  }

  private linkParser(message: Message) {
    const matches = (message.content.match(IN_GAME_REGEX) ?? []).slice(0, 3);

    for (const text of matches) {
      const url = new URL(text);
      const action = url.searchParams.get('action')?.toLowerCase();
      if (!action) continue;

      switch (action) {
        case 'openplayerprofile': {
          const tag = url.searchParams.get('tag');
          if (!tag) continue;
          return this.client.commandHandler.getCommand('player')?.run(message, { tag });
        }
        case 'openclanprofile': {
          const tag = url.searchParams.get('tag');
          return this.client.commandHandler.getCommand('clan')?.run(message, { tag });
        }
        case 'supportcreator':
          break;
        case 'openmoresettings':
          break;
        case 'openhelpshift':
          break;
        case 'openlayout':
          break;
        case 'copyarmy': {
          const army = url.searchParams.get('army');
          if (!army) continue;
          return this.client.commandHandler.getCommand('army')?.run(message, { link: url.href });
        }
        default:
          break;
      }
    }
  }

  private parseWithPrefix(messageContent: string, prefix: string) {
    const lowerContent = messageContent.toLowerCase();
    if (!lowerContent.startsWith(prefix.toLowerCase())) return null;

    const endOfPrefix = lowerContent.indexOf(prefix.toLowerCase()) + prefix.length;
    const startOfArgs = messageContent.slice(endOfPrefix).search(/\S/) + prefix.length;
    const alias = messageContent.slice(startOfArgs).split(/\s{1,}|\n{1,}/)[0];

    const command = this.client.commandHandler.getCommand(alias);
    const content = messageContent.slice(startOfArgs + alias.length + 1).trim();
    const contents = content.split(/\s+/g);

    return { command, content, contents };
  }

  private inhibitor(message: Message) {
    const guilds = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
    const users = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
    return guilds.includes(message.guild!.id) || users.includes(message.author.id);
  }
}
