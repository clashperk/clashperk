import { Collections } from '@app/constants';
import { ClanLogType } from '@app/entities';
import { CommandInteraction, TextChannel } from 'discord.js';
import { title as toTitle } from 'radash';
import { Args, Command } from '../../lib/index.js';
import { DeprecatedLogs, logActionsMap } from './setup-logs.js';

function title(str: string) {
  return toTitle(str).replace(/cwl/i, 'CWL');
}

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
      channel: {
        match: 'CHANNEL',
        default: interaction.channel
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { action: 'unlink-channel' | 'delete-clan' | 'disable-logs' | keyof typeof DeprecatedLogs; channel: TextChannel; clan: string }
  ) {
    if (args.action === 'disable-logs') {
      const command = this.handler.getCommand('setup-logs')!;
      return this.handler.continue(interaction, command);
    }

    args.clan = this.client.http.fixTag(args.clan);
    if (args.action === 'unlink-channel') {
      const value = await this.client.storage.collection.findOneAndUpdate(
        { channels: args.channel.id, guild: interaction.guildId },
        { $pull: { channels: args.channel.id } },
        { returnDocument: 'after' }
      );

      if (value) {
        return interaction.editReply(
          this.i18n('command.setup.disable.channel_unlink', {
            lng: interaction.locale,
            clan: `**${value.name}**`,
            channel: `<#${args.channel.id}>`
          })
        );
      }

      return interaction.editReply(
        this.i18n('command.setup.disable.channel_not_found', {
          lng: interaction.locale,
          channel: args.channel.toString() // eslint-disable-line
        })
      );
    }

    const data = await this.client.storage.getClan({ clanTag: args.clan, guildId: interaction.guildId });
    if (!data) {
      return interaction.editReply(this.i18n('command.setup.disable.clan_not_linked', { lng: interaction.locale }));
    }

    const clanId = data._id.toHexString();
    if (args.action === 'delete-clan') {
      await this.client.rpcHandler.delete({ tag: data.tag, guild: interaction.guildId });
      await this.client.storage.deleteReminders(data.tag, interaction.guildId);
      await this.client.storage.delete(clanId);
      await this.client.rpcHandler.delete({ tag: data.tag, guild: interaction.guildId });

      return interaction.editReply(
        this.i18n('command.setup.disable.clan_deleted', {
          lng: interaction.locale,
          clan: `**${data.name as string} (${data.tag as string})**`
        })
      );
    }

    const logTypes = Object.keys(logActionsMap) as ClanLogType[];
    const _logs = await this.client.db
      .collection(Collections.CLAN_LOGS)
      .find({ logType: { $in: logTypes }, clanTag: data.tag, guildId: interaction.guildId })
      .toArray();

    const selectedLogs = DeprecatedLogs[args.action];
    if (!selectedLogs) {
      throw new Error(`Invalid action: ${args.action}`);
    }

    const logIds = _logs.filter((log) => selectedLogs.includes(log.logType)).map((log) => log._id);
    logIds.forEach((logId) => this.client.rpcHandler.deleteLog(logId.toHexString()));
    await this.client.db.collection(Collections.CLAN_LOGS).deleteMany({ _id: { $in: logIds } });

    return interaction.editReply({
      content: [
        `## ${data.name} (${data.tag})`,
        '### The logs have been disabled',
        selectedLogs.map((log) => `- ${title(log)}`).join('\n')
      ].join('\n'),
      components: []
    });
  }
}
