import { CommandInteraction, TextChannel } from 'discord.js';
import { Args, Command } from '../../lib/index.js';

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
    args: { action: 'unlink-channel' | 'delete-clan' | 'disable-logs'; channel: TextChannel; clan: string }
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

    throw new Error(`Command "${args.action as string}" not found.`);
  }
}
