import { CommandInteraction, TextChannel } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Args, Command } from '../../lib/index.js';
import { Collections, Flags } from '../../util/Constants.js';

const names: Record<string, string> = {
  [Flags.DONATION_LOG]: 'Donation Log',
  [Flags.CLAN_FEED_LOG]: 'Clan Feed',
  [Flags.LAST_SEEN_LOG]: 'Last Seen',
  [Flags.LEGEND_LOG]: 'Legend Log',
  [Flags.CLAN_EMBED_LOG]: 'Clan Embed',
  [Flags.CLAN_GAMES_LOG]: 'Clan Games',
  [Flags.CLAN_WAR_LOG]: 'War Feed',
  [Flags.CHANNEL_LINKED]: 'Linked Channel',
  [Flags.JOIN_LEAVE_LOG]: 'Join/Leave Log',
  [Flags.CAPITAL_LOG]: 'Capital Log'
};

export default class SetupDisableCommand extends Command {
  public constructor() {
    super('setup-disable', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      userPermissions: ['ManageGuild'],
      defer: true,
      ephemeral: true
    });
  }

  public args(interaction: CommandInteraction<'cached'>): Args {
    return {
      option: {
        match: 'ENUM',
        enums: [
          ['channel-link'],
          ['all', 'remove-clan'],
          [Flags.CLAN_EMBED_LOG.toString(), 'clan-embed'],
          [Flags.LEGEND_LOG.toString(), 'legend-log'],
          [Flags.CAPITAL_LOG.toString(), 'capital-log'],
          [Flags.JOIN_LEAVE_LOG.toString(), 'join-leave'],
          [Flags.LAST_SEEN_LOG.toString(), 'lastseen'],
          [Flags.CLAN_WAR_LOG.toString(), 'war-feed'],
          [Flags.CLAN_GAMES_LOG.toString(), 'clan-games'],
          [Flags.CLAN_FEED_LOG.toString(), 'clan-feed'],
          [Flags.DONATION_LOG.toString(), 'donation-log']
        ]
      },
      channel: {
        match: 'CHANNEL',
        default: interaction.channel!
      }
    };
  }

  private parseTag(tag?: string) {
    return tag ? this.client.http.fixTag(tag) : undefined;
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    { option, tag, channel }: { option: string; channel: TextChannel; tag?: string }
  ) {
    tag = this.parseTag(tag);
    if (option === 'channel-link') {
      const { value } = await this.client.storage.collection.findOneAndUpdate(
        { channels: channel.id },
        { $pull: { channels: channel.id } },
        { returnDocument: 'after' }
      );

      if (value) {
        const id = value._id.toHexString();
        if (!value.channels?.length) await this.updateFlag(id, Flags.CHANNEL_LINKED);
        return interaction.editReply(
          this.i18n('command.setup.disable.channel_unlink', {
            lng: interaction.locale,
            clan: `**${value.name}**`,
            channel: `<#${channel.id}>`
          })
        );
      }

      return interaction.editReply(
        this.i18n('command.setup.disable.channel_not_found', {
          lng: interaction.locale,
          channel: channel.toString() // eslint-disable-line
        })
      );
    }

    if (!tag) return interaction.editReply(this.i18n('common.no_clan_tag_first_time', { lng: interaction.locale }));
    const data = await this.client.db.collection(Collections.CLAN_STORES).findOne({ tag, guild: interaction.guild!.id });

    if (!data) {
      return interaction.editReply(this.i18n('command.setup.disable.clan_not_linked', { lng: interaction.locale }));
    }

    const id = data._id.toHexString();
    if (option === 'all') {
      await this.client.storage.delete(id);
      await this.client.storage.deleteReminders(data.tag, interaction.guild.id);

      await this.client.rpcHandler.delete(id, { tag: data.tag, op: 0, guild: interaction.guild!.id });
      return interaction.editReply(
        this.i18n('command.setup.disable.clan_deleted', {
          lng: interaction.locale,
          clan: `**${data.name as string} (${data.tag as string})**`
        })
      );
    }

    const deleted = await this.client.storage.remove(data._id.toHexString(), { op: Number(option) });
    if (deleted?.deletedCount) await this.updateFlag(id, Number(option));
    await this.client.rpcHandler.delete(id, { op: Number(option), tag: data.tag, guild: interaction.guild!.id });
    return interaction.editReply(
      this.i18n('command.setup.disable.feature_disabled', {
        lng: interaction.locale,
        feature: `**${names[option]}**`,
        clan: `**${data.name as string} (${data.tag as string})**`
      })
    );
  }

  private updateFlag(id: string, option: number) {
    return this.client.db.collection(Collections.CLAN_STORES).updateOne({ _id: new ObjectId(id) }, { $bit: { flag: { xor: option } } });
  }
}
