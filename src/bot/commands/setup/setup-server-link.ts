import { AnyThreadChannel, CommandInteraction, TextChannel } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Collections, Flags } from '../../util/constants.js';

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
      tag?: string;
      clan?: string;
      channel?: TextChannel | AnyThreadChannel;
      color?: number;
      category?: string;
      clan_alias?: string;
      clan_nickname?: string;
    }
  ) {
    const data = await this.client.resolver.enforceSecurity(interaction, {
      tag: args.tag || args.clan,
      collection: Collections.CLAN_STORES
    });
    if (!data) return;

    const clan = await this.client.storage.collection.findOne({ tag: data.tag, guild: interaction.guild.id });
    const categoryId = args.category
      ? await this.client.storage.findOrCreateCategory({ category: args.category, guildId: interaction.guildId })
      : clan?.categoryId;

    if (args.channel) {
      await this.client.storage.collection.updateOne(
        { tag: data.tag, guild: interaction.guild.id },
        { $push: { channels: args.channel.id } }
      );
    }

    const id = await this.client.storage.register(interaction, {
      op: Flags.SERVER_LINKED,
      guild: interaction.guild.id,
      name: data.name,
      tag: data.tag,
      hexCode: args.color,
      categoryId
    });

    await this.client.rpcHandler.add(id, {
      op: Flags.CHANNEL_LINKED,
      tag: data.tag,
      guild: interaction.guild.id
    });

    return interaction.editReply(
      this.i18n('command.setup.enable.server_link.success', {
        lng: interaction.locale,
        clan: `${data.name} (${data.tag})`,
        guild: interaction.guild.name
      })
    );
  }
}
