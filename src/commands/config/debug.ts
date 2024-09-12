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
import { Args, Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/emojis.js';
import { padEnd, padStart } from '../../util/helper.js';
import { Util } from '../../util/index.js';

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
    { channel }: { channel: Exclude<TextBasedChannel, DMChannel | PartialDMChannel | PartialGroupDMChannel> }
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
    const fetched = await this.client.http._getClans(clans);

    const cycle = await this.client.redis.connection.hGetAll('cycle').then((data) => ({
      clans: Number(data.CLAN_LOOP || 0),
      players: Number(data.PLAYER_LOOP || 0),
      wars: Number(data.WAR_LOOP || 0)
    }));

    const UEE_FOR_SLASH = interaction.appPermissions.has('UseExternalEmojis');
    const emojis = UEE_FOR_SLASH ? { cross: EMOJIS.WRONG, tick: EMOJIS.OK, none: EMOJIS.EMPTY } : { cross: '❌', tick: '☑️', none: '⬛' };

    const webhookChannel = channel.isThread() ? channel.parent! : channel;
    const webhooks = webhookChannel.permissionsFor(this.client.user!.id)?.has(['ManageWebhooks', 'ViewChannel'])
      ? await webhookChannel.fetchWebhooks()
      : null;

    const chunks = Util.splitMessage(
      [
        `**${this.client.user!.displayName} Debug Menu**`,
        '',
        '**Server ID**',
        `${interaction.guild.id}`,
        '**Shard ID**',
        `[${interaction.guild.shard.id} / ${this.client.shard?.count ?? 1}]`,
        '**Channel ID**',
        `${interaction.channelId}`,
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
        `**Loop Time ${cycle.clans && cycle.players && cycle.wars ? '' : '(Processing...)'}**`,
        `${emojis.none} \` ${'CLANS'.padStart(7, ' ')} \` \` ${'WARS'.padStart(7, ' ')} \` \` ${'PLAYERS'} \``,
        `${emojis.tick} \` ${this.fixTime(cycle.clans).padStart(7, ' ')} \` \` ${this.fixTime(cycle.wars).padStart(
          7,
          ' '
        )} \` \` ${this.fixTime(cycle.players).padStart(7, ' ')} \``,
        '',
        '**Clan Status and Player Loop Info**',
        `${emojis.none} \`\u200e ${'CLAN NAME'.padEnd(15, ' ')} \u200f\` \`\u200e ${'UPDATED'} \u200f\` \`\u200e ${'WAR LOG'} \u200f\``,
        clans
          .map((clan) => {
            const lastRan = clan.lastRan ? ms(Date.now() - clan.lastRan.getTime()) : '...';
            const warLog = fetched.find((data) => data.tag === clan.tag)?.isWarLogPublic;
            const sign = clan.active && !clan.paused && warLog ? emojis.tick : emojis.cross;
            return `${sign} \`\u200e ${padEnd(clan.name, 15)} \u200f\` \`\u200e ${padStart(lastRan, 3)} ago \u200f\` \`\u200e ${padStart(warLog ? 'Public' : 'Private', 7)} \u200f\``;
          })
          .join('\n')
      ].join('\n')
    );

    await interaction.editReply({ content: chunks[0], allowedMentions: { roles: [] } });
    for (const chunk of chunks.slice(1)) {
      if (interaction.channel && interaction.appPermissions.has(['SendMessages', 'ViewChannel', 'SendMessagesInThreads'])) {
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
