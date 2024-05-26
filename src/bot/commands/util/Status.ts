import { CommandInteraction, EmbedBuilder, Guild, Message } from 'discord.js';
import moment from 'moment';
import 'moment-duration-format';
import { readFile } from 'node:fs/promises';
import os from 'os';
import { fileURLToPath, URL } from 'url';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';

const pkgPath = fileURLToPath(new URL('../../../../../package.json', import.meta.url).href);
const pkg = JSON.parse((await readFile(pkgPath)).toString()) as { version: string };

export default class StatusCommand extends Command {
  public constructor() {
    super('status', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      ownerOnly: true,
      defer: true,
      ephemeral: true
    });
  }

  public async run(message: Message) {
    const embed = await this.get(message.guild!);
    return message.channel.send({ embeds: [embed] });
  }

  public async exec(interaction: CommandInteraction) {
    const embed = await this.get(interaction.guild!);
    return interaction.editReply({ embeds: [embed] });
  }

  public async get(guild: Guild) {
    let [guilds, memory] = [0, 0];
    const values = await this.client.shard?.broadcastEval((client) => [
      client.guilds.cache.size,
      process.memoryUsage().heapUsed / 1024 / 1024
    ]);

    for (const value of values ?? [[this.client.guilds.cache.size, process.memoryUsage().heapUsed / 1024 / 1024]]) {
      guilds += value[0];
      memory += value[1];
    }

    const owner = await this.client.users.fetch(this.client.ownerId);
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(guild.id))
      .setTitle('Stats')
      .setAuthor({ name: `${this.client.user!.displayName}`, iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }) })
      .addFields([
        {
          name: 'Memory Usage',
          value: `${memory.toFixed(2)} MB`,
          inline: true
        },
        {
          name: 'Free Memory',
          value: `${this.freemem.toFixed(2)} MB`,
          inline: true
        },
        {
          name: 'Uptime',
          value: moment.duration(process.uptime() * 1000).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' }),
          inline: true
        },
        {
          name: 'Servers',
          value: guilds.toLocaleString(),
          inline: true
        },
        {
          name: 'Clans',
          value: `${(await this.count(Collections.CLAN_STORES)).toLocaleString()}`,
          inline: true
        },
        {
          name: 'Players',
          value: `${(await this.count(Collections.PLAYERS)).toLocaleString()}`,
          inline: true
        },
        {
          name: 'Shard',
          value: `${guild.shard.id}/${this.client.shard?.count ?? 1}`,
          inline: true
        },
        {
          name: 'Version',
          value: `[${pkg.version}](https://github.com/clashperk/clashperk/commit/${process.env.GIT_SHA!})`,
          inline: true
        },
        {
          name: 'Runtime',
          value: `[Node.js ${process.version}](https://nodejs.org)`,
          inline: true
        }
      ])
      .setFooter({
        text: `© ${new Date().getFullYear()} ${owner.username}`,
        iconURL: owner.displayAvatarURL({ forceStatic: false })
      });
    return embed;
  }

  private get freemem() {
    return os.freemem() / (1024 * 1024);
  }

  private count(collection: string) {
    return this.client.db.collection(collection).estimatedDocumentCount();
  }
}
