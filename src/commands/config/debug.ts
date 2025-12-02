import { getInfo } from 'discord-hybrid-sharding';
import {
  CommandInteraction,
  DMChannel,
  Interaction,
  PartialDMChannel,
  PartialGroupDMChannel,
  PermissionsString,
  TextBasedChannel
} from 'discord.js';
import ms from 'ms';
import { camel } from 'radash';
import { Args, Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { padEnd, padStart } from '../../util/helper.js';
import { Util } from '../../util/toolkit.js';

export default class DebugCommand extends Command {
  public constructor() {
    super('debug', {
      category: 'config',
      channel: 'guild',
      defer: true
    });
  }

  public args(interaction: Interaction): Args {
    return {
      channel: {
        match: 'CHANNEL',
        default: interaction.channel
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    {
      channel
    }: { channel: Exclude<TextBasedChannel, DMChannel | PartialDMChannel | PartialGroupDMChannel> }
  ) {
    const permissions: PermissionsString[] = [
      'ViewChannel',
      'SendMessages',
      'EmbedLinks',
      'AttachFiles',
      'UseExternalEmojis',
      'ReadMessageHistory',
      'ManageWebhooks'
    ];

    const clans = await this.client.storage.find(interaction.guild.id);
    const fetched = await this.client.coc._getClans(clans);

    const timingMap = await this.client.redis.connection.hGetAll('loop_timings');
    const timings = Object.entries(timingMap).reduce<Record<string, number>>(
      (record, [key, value]) => {
        if (!key.includes('_loop')) return record;
        const payload = JSON.parse(value) as { timeTaken: number; timestamp: number };
        record[camel(key)] = payload.timeTaken || 0;
        return record;
      },
      { clanLoop: 0, playerLoop: 0, warLoop: 0 }
    );

    const UEE_FOR_SLASH = interaction.appPermissions.has('UseExternalEmojis');
    const emojis = UEE_FOR_SLASH
      ? { cross: EMOJIS.WRONG, tick: EMOJIS.OK, none: EMOJIS.EMPTY }
      : { cross: '❌', tick: '☑️', none: '⬛' };

    const webhookChannel = channel.isThread() ? channel.parent! : channel;
    const webhooks = webhookChannel
      .permissionsFor(this.client.user.id)
      ?.has(['ManageWebhooks', 'ViewChannel'])
      ? await webhookChannel.fetchWebhooks()
      : null;

    const chunks = Util.splitMessage(
      [
        `**${this.client.user.displayName} Debug Menu**`,
        '',
        '**Server ID**',
        `${interaction.guild.id}`,
        '**Shard ID**',
        `[${interaction.guild.shard.id} / ${getInfo().TOTAL_SHARDS}] (Cluster ${this.client.cluster.id})`,
        '**Channel**',
        `<#${interaction.channelId}> (${interaction.channelId})`,
        '**Patreon Status**',
        `${this.client.subscribers.has(interaction.guild.id) ? `Active` : `Inactive`}`,
        '',
        '**Channel Permissions**',
        permissions
          .map((perm) => {
            const hasPerm = channel.permissionsFor(interaction.guild.members.me!).has(perm);
            return `${hasPerm ? emojis.tick : emojis.cross} ${this.fixName(perm)}`;
          })
          .join('\n'),
        '',
        '**Webhooks**',
        webhooks?.size ?? 0,
        '',
        `**Loop Time ${timings.clanLoop && timings.playerLoop && timings.warLoop ? '' : '(Processing...)'}**`,
        `${emojis.none} \`\u200e ${'CLANS'.padStart(8, ' ')} \u200b ${'WARS'.padStart(8, ' ')} \u200b ${' PLAYERS'} \u200f\``,
        `${emojis.tick} \`\u200e ${this.fixTime(timings.clanLoop).padStart(8, ' ')} \u200b ${this.fixTime(
          timings.warLoop
        ).padStart(8, ' ')} \u200b ${this.fixTime(timings.playerLoop).padStart(8, ' ')} \u200f\``,
        '',
        '**Clan Status and Player Loop Info**',
        '*The war log must be made publicly accessible for the bot to function properly.*',

        `${emojis.none} \`\u200e${'CLAN NAME'.padEnd(15, ' ')} ${'SYNC'} \u200b ${'WAR LOG'} \u200f\``,
        clans
          .map((clan) => {
            const lastRan = clan.lastRan ? ms(Date.now() - clan.lastRan.getTime()) : '...';
            const warLog = fetched.find((data) => data.tag === clan.tag)?.isWarLogPublic;
            const sign = clan.active && !clan.paused && warLog ? emojis.tick : emojis.cross;
            return `${sign} \`\u200e${padEnd(clan.name, 15)} ${padStart(lastRan, 4)} \u200b ${padEnd(warLog ? 'Public' : 'Private', 7)} \u200f\``;
          })
          .join('\n')
      ].join('\n')
    );

    await interaction.editReply({ content: chunks[0], allowedMentions: { roles: [] } });
    for (const chunk of chunks.slice(1)) {
      if (
        interaction.channel &&
        interaction.appPermissions.has(['SendMessages', 'ViewChannel', 'SendMessagesInThreads'])
      ) {
        await interaction.channel.send({ content: chunk, allowedMentions: { roles: [] } });
      } else {
        await interaction.followUp({ content: chunk, allowedMentions: { roles: [] } });
      }
    }
  }

  private fixTime(num: number) {
    return num === 0 ? `...` : `${ms(num)}`;
  }

  private fixName(perm: string) {
    if (perm === 'VIEW_CHANNEL') return 'Read Messages';
    return perm
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim()
      .replace(/\b(\w)/g, (char) => char.toUpperCase());
  }
}
