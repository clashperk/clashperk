import { Collections } from '@app/constants';
import { CommandInteraction, EmbedBuilder, Guild, Message } from 'discord.js';
import moment from 'moment';
import { readFile } from 'node:fs/promises';
import os from 'os';
import { URL, fileURLToPath } from 'url';
import { Command } from '../../lib/handlers.js';

const pkgPath = fileURLToPath(new URL('../../../../package.json', import.meta.url).href);
const pkg = JSON.parse((await readFile(pkgPath)).toString()) as { version: string };

export default class StatusCommand extends Command {
  public constructor() {
    super('status', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true,
      ephemeral: true
    });
  }

  public async run(message: Message<true>) {
    const embed = await this.get(message.guild, this.client.isOwner(message.author));
    return message.channel.send({ embeds: [embed] });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const embed = await this.get(interaction.guild, this.client.isOwner(interaction.user));
    return interaction.editReply({ embeds: [embed] });
  }

  public async get(guild: Guild, isOwner: boolean) {
    let [guilds, memory] = [0, 0];
    const values = await this.client.shard?.broadcastEval((client) => [
      client.guilds.cache.size,
      process.memoryUsage().heapUsed / 1024 / 1024
    ]);

    for (const value of values ?? [[this.client.guilds.cache.size, process.memoryUsage().heapUsed / 1024 / 1024]]) {
      guilds += value[0];
      memory += value[1];
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(guild.id))
      .setAuthor({ name: `${this.client.user!.displayName}`, iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }) })
      .addFields({
        name: 'Memory Usage',
        value: `${memory.toFixed(2)} MB`,
        inline: false
      });

    embed.addFields({
      name: 'Free Memory',
      value: `${this.freemem.toFixed(2)} MB`,
      inline: false
    });

    embed.addFields(
      {
        name: 'Uptime',
        value: moment.duration(process.uptime() * 1000).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' }),
        inline: false
      },
      {
        name: 'Servers',
        value: guilds.toLocaleString(),
        inline: false
      },
      {
        name: 'Commands Used',
        value: `${(await this.usage()).toLocaleString()} (last 30d)`,
        inline: false
      },
      {
        name: 'Clans',
        value: `${(await this.count(Collections.CLAN_STORES)).toLocaleString()}`,
        inline: false
      }
    );

    embed.addFields(
      {
        name: 'Players',
        value: `${(await this.count(Collections.PLAYERS)).toLocaleString()}`,
        inline: false
      },
      {
        name: 'Links',
        value: `${(await this.count(Collections.PLAYER_LINKS)).toLocaleString()}`,
        inline: false
      }
    );

    embed.addFields(
      {
        name: 'Shard',
        value: `${guild.shard.id}/${this.client.shard?.count ?? 1}`,
        inline: false
      },
      {
        name: 'Version',
        value: isOwner ? `[${pkg.version}](https://github.com/clashperk/clashperk/commit/${process.env.GIT_SHA})` : pkg.version,
        inline: false
      },
      {
        name: 'Status Page',
        value: 'https://status.clashperk.com',
        inline: false
      }
    );

    return embed;
  }

  private get freemem() {
    return os.freemem() / (1024 * 1024);
  }

  private count(collection: string) {
    return this.client.db.collection(collection).estimatedDocumentCount();
  }

  private async usage() {
    const [usage] = await this.client.db
      .collection(Collections.BOT_USAGE)
      .aggregate<{ total: number }>([
        {
          $sort: {
            createdAt: -1
          }
        },
        {
          $match: {
            createdAt: {
              $gte: moment().subtract(30, 'days').toDate()
            }
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$usage'
            }
          }
        }
      ])
      .toArray();

    return usage?.total ?? 0;
  }
}
