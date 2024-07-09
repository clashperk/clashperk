import { CommandInteraction, Interaction, TextChannel } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Collections, Flags } from '../../util/_constants.js';

export default class ChannelLinkCommand extends Command {
  public constructor() {
    super('setup-channel-link', {
      category: 'none',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      defer: true,
      ephemeral: true
    });
  }

  public args(interaction: Interaction<'cached'>): Args {
    return {
      channel: {
        match: 'CHANNEL',
        default: interaction.channel
      }
    };
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; channel: TextChannel }) {
    const data = await this.client.resolver.enforceSecurity(interaction, { tag: args.tag, collection: Collections.CLAN_STORES });
    if (!data) return;

    const id = await this.client.storage.register(interaction, {
      op: Flags.CHANNEL_LINKED,
      guild: interaction.guild.id,
      name: data.name,
      tag: data.tag
    });

    await this.client.rpcHandler.add(id, {
      op: Flags.CHANNEL_LINKED,
      tag: data.tag,
      guild: interaction.guild.id
    });

    const store = await this.client.storage.collection.findOne({ channels: args.channel.id });
    if (store) {
      return interaction.editReply(
        this.i18n('command.setup.enable.channel_link.already_linked', {
          lng: interaction.locale,
          clan: `${store.name} (${store.tag})`,
          channel: args.channel.toString() // eslint-disable-line @typescript-eslint/no-base-to-string
        })
      );
    }

    const { upsertedCount, upsertedId } = await this.client.storage.collection.updateOne(
      { guild: interaction.guild.id, tag: data.tag },
      {
        $set: {
          name: data.name,
          tag: data.tag,
          paused: false,
          verified: true,
          active: true,
          guild: interaction.guild.id,
          patron: this.client.patreonHandler.get(interaction.guild.id)
        },
        $push: {
          channels: args.channel.id
        },
        $bit: {
          flag: { or: Flags.CHANNEL_LINKED }
        },
        $min: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    if (upsertedCount && upsertedId) {
      await this.client.rpcHandler.add(upsertedId.toHexString(), {
        op: Flags.CHANNEL_LINKED,
        guild: interaction.guild.id,
        tag: data.tag
      });
    }

    return interaction.editReply(
      this.i18n('command.setup.enable.channel_link.success', {
        lng: interaction.locale,
        channel: `<#${args.channel.id}>`,
        clan: `${data.name} (${data.tag})`
      })
    );
  }
}
