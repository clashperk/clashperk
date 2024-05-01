import { Message } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

export default class GuildBanCommand extends Command {
  public constructor() {
    super('guild-ban', {
      category: 'owner',
      ownerOnly: true,
      defer: false
    });
  }

  public args(): Args {
    return {
      id: {
        match: 'STRING'
      }
    };
  }

  private getGuild(id: string) {
    if (this.client.guilds.cache.has(id)) return this.client.guilds.cache.get(id);
    return { id, name: id };
  }

  public run(message: Message, { id }: { id: string }) {
    const guild = this.getGuild(id);
    if (!guild) return message.reply('Invalid guildId.');

    const blacklist = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
    if (blacklist.includes(guild.id)) {
      const index = blacklist.indexOf(guild.id);
      blacklist.splice(index, 1);
      if (blacklist.length === 0) this.client.settings.delete('global', Settings.GUILD_BLACKLIST);
      else this.client.settings.set('global', Settings.GUILD_BLACKLIST, blacklist);

      return message.channel.send(`**${guild.name}** has been removed from the ${this.client.user!.displayName}'s blacklist.`);
    }

    blacklist.push(guild.id);
    this.client.settings.set('global', Settings.GUILD_BLACKLIST, blacklist);

    return message.channel.send(`**${guild.name}** has been blacklisted from using ${this.client.user!.displayName}'s command.`);
  }
}
