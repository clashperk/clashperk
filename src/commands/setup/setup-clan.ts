import { Collections, Flags } from '@app/constants';
import { AnyThreadChannel, CommandInteraction, TextChannel } from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';

export default class ServerLinkCommand extends Command {
  public constructor() {
    super('setup-server-link', {
      aliases: ['setup-clan'],
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      userPermissions: ['ManageGuild'],
      defer: true,
      ephemeral: true
    });
  }

  public args(interaction: CommandInteraction<'cached'>): Args {
    return {
      color: {
        match: 'COLOR',
        default: this.client.embed(interaction)
      },
      channel: {
        match: 'CHANNEL'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      clan: string;
      clan_channel?: TextChannel | AnyThreadChannel;
      color?: number;
      category?: string;
      clan_alias?: string;
      clan_nickname?: string;
      unlink_clan_channel?: TextChannel | AnyThreadChannel;
      unlink_clan?: boolean;
    }
  ) {
    args.clan = this.client.coc.fixTag(args.clan);

    if (args.unlink_clan_channel) {
      const value = await this.client.storage.collection.findOneAndUpdate(
        { channels: args.unlink_clan_channel.id, guild: interaction.guildId },
        { $pull: { channels: args.unlink_clan_channel.id } },
        { returnDocument: 'after' }
      );

      if (value) {
        return interaction.editReply(
          this.i18n('command.setup.disable.channel_unlink', {
            lng: interaction.locale,
            clan: `**${value.name}**`,
            channel: `<#${args.unlink_clan_channel.id}>`
          })
        );
      }

      return interaction.editReply(
        this.i18n('command.setup.disable.channel_not_found', {
          lng: interaction.locale,
          channel: args.unlink_clan_channel.toString()
        })
      );
    }

    if (args.unlink_clan) {
      const clan = await this.client.storage.getClan({
        clanTag: args.clan,
        guildId: interaction.guildId
      });
      if (!clan) {
        return interaction.editReply(
          this.i18n('command.setup.disable.clan_not_linked', { lng: interaction.locale })
        );
      }

      await this.client.enqueuer.delete({ tag: clan.tag, guild: interaction.guildId });
      await this.client.storage.deleteReminders(clan.tag, interaction.guildId);
      await this.client.storage.delete(clan._id.toHexString());
      await this.client.enqueuer.delete({ tag: clan.tag, guild: interaction.guildId });

      return interaction.editReply(
        this.i18n('command.setup.disable.clan_deleted', {
          lng: interaction.locale,
          clan: `**${clan.name as string} (${clan.tag as string})**`
        })
      );
    }

    const data = await this.client.resolver.enforceSecurity(interaction, {
      tag: args.clan,
      collection: Collections.CLAN_STORES
    });
    if (!data) return;

    const [clan, category] = await Promise.all([
      this.client.storage.getClan({
        clanTag: data.tag,
        guildId: interaction.guildId
      }),
      this.client.storage.findOrCreateCategory({
        category: args.category,
        guildId: interaction.guildId
      })
    ]);

    await this.client.storage.register(interaction, {
      op: Flags.SERVER_LINKED,
      guild: interaction.guild.id,
      name: data.name,
      tag: data.tag,
      hexCode: args.color,
      categoryId: category?._id || clan?.categoryId
    });

    await this.client.enqueuer.add({
      tag: data.tag,
      guild: interaction.guild.id
    });

    const linkedToAnother = args.clan_channel
      ? await this.client.storage.collection.findOne({
          guild: interaction.guildId,
          channels: args.clan_channel.id,
          tag: { $ne: data.tag }
        })
      : null;

    if (linkedToAnother && args.clan_channel) {
      return interaction.editReply(
        this.i18n('command.setup.enable.channel_link.already_linked', {
          lng: interaction.locale,
          clan: `${linkedToAnother.name} (${linkedToAnother.tag})`,
          channel: args.clan_channel.toString()
        })
      );
    }

    if (!linkedToAnother && args.clan_channel) {
      await this.client.storage.collection.updateOne(
        { tag: data.tag, guild: interaction.guildId },
        { $addToSet: { channels: args.clan_channel.id } }
      );
    }

    return interaction.editReply({
      content: this.i18n('command.setup.enable.server_link.success', {
        lng: interaction.locale,
        clan: `**${data.name} (${data.tag})**`,
        guild: `**${interaction.guild.name}**${args.clan_channel && !linkedToAnother ? ` ${args.clan_channel?.toString()}` : ''}${category ? ` with category **${category.displayName}**` : ''}`
      })
    });
  }
}
