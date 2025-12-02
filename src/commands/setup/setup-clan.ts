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
      channel?: TextChannel | AnyThreadChannel;
      color?: number;
      category?: string;
      clan_alias?: string;
      clan_nickname?: string;
      action?: string;
    }
  ) {
    const data = await this.client.resolver.enforceSecurity(interaction, {
      tag: args.clan,
      collection: Collections.CLAN_STORES
    });
    if (!data) return;

    if (args.action === 'link-channel' && !args.channel) {
      args.channel = interaction.channel as TextChannel | AnyThreadChannel;
    }

    const clan = await this.client.storage.getClan({
      clanTag: data.tag,
      guildId: interaction.guildId
    });
    const categoryId = await this.client.storage.findOrCreateCategory({
      category: args.category,
      guildId: interaction.guildId
    });

    await this.client.storage.register(interaction, {
      op: Flags.SERVER_LINKED,
      guild: interaction.guild.id,
      name: data.name,
      tag: data.tag,
      hexCode: args.color,
      categoryId: categoryId || clan?.categoryId
    });

    await this.client.enqueuer.add({
      tag: data.tag,
      guild: interaction.guild.id
    });

    const linked = args.channel
      ? await this.client.storage.collection.findOne({
          guild: interaction.guildId,
          channels: args.channel.id,
          tag: { $ne: data.tag }
        })
      : null;

    if (linked && args.channel) {
      return interaction.editReply(
        this.i18n('command.setup.enable.channel_link.already_linked', {
          lng: interaction.locale,
          clan: `${linked.name} (${linked.tag})`,
          channel: args.channel.toString()
        })
      );
    }

    if (!linked && args.channel) {
      await this.client.storage.collection.updateOne(
        { tag: data.tag, guild: interaction.guildId },
        { $addToSet: { channels: args.channel.id } }
      );
    }

    return interaction.editReply({
      content: this.i18n('command.setup.enable.server_link.success', {
        lng: interaction.locale,
        clan: `${data.name} (${data.tag})`,
        guild: `${interaction.guild.name} ${args.channel && !linked ? `${args.channel?.toString()}` : ''}`
      })
    });
  }
}
