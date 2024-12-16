import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ForumChannel,
  Guild,
  Message
} from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';

export default class SuggestionsCommand extends Command {
  public constructor() {
    super('suggestions', {
      category: 'owner',
      ownerOnly: true,
      defer: false
    });
  }

  public async exec(interaction: ButtonInteraction<'cached'>) {
    const channel = this.getChannel(interaction.guild);
    if (!channel) return;

    await interaction.update({ content: `Updating...${EMOJIS.LOADING}` });

    const embed = await this.getEmbed(channel);
    return interaction.editReply({ embeds: [embed], content: null });
  }

  public async run(message: Message<true>) {
    const channel = this.getChannel(message.guild);
    if (!channel) return;

    const embed = await this.getEmbed(channel);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(EMOJIS.REFRESH)
        .setCustomId(this.createId({ cmd: this.id, defer: false }))
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  private getChannel(guild: Guild) {
    const channel = guild.channels.cache.get('1020177547092307999');
    if (!channel || channel?.type !== ChannelType.GuildForum) return null;

    return channel;
  }

  private async getEmbed(channel: ForumChannel) {
    let { threads } = await channel.threads.fetchActive(false);
    let hasMore = true;
    let lastThreadId: string | undefined;

    do {
      const { threads: fetchedThreads, hasMore: hasMoreThreads } = await channel.threads.fetchArchived(
        {
          fetchAll: true,
          before: lastThreadId,
          limit: 100
        },
        false
      );

      threads = threads.concat(fetchedThreads);
      lastThreadId = fetchedThreads.last()?.id;
      hasMore = hasMoreThreads;
    } while (hasMore);

    const record = {
      'Total': threads.size,
      'Done': 0,
      'Pending': 0,
      'High': 0,
      'Medium': 0,
      'Invalid': 0,
      'Queued': 0,
      'In Progress': 0,
      'API Limitation': 0,
      'Feature Exists': 0
    };

    const untagged = threads.filter((thread) => !thread.appliedTags.length);

    channel.availableTags.forEach((tag) => {
      const threadsWithTag = threads.filter((thread) => thread.appliedTags.includes(tag.id));
      Object.assign(record, { [tag.name]: threadsWithTag.size });
    });
    record.Pending = record.High + record.Medium;

    const embed = new EmbedBuilder();
    embed.setColor(this.client.embed(channel.guild.id));
    embed.setTitle('Suggestions');
    embed.setDescription(
      Object.entries(record)
        .map(([key, value]) => {
          const lineBreak = key === 'Pending' || key === 'Medium' || key === 'Total' ? '\n' : '';
          return `${key}: ${value}${lineBreak}`;
        })
        .join('\n')
    );

    if (untagged.size) {
      embed.addFields({
        name: 'Untagged Threads',
        value: untagged.map((thread) => `<#${thread.id}>`).join('\n')
      });
    }

    return embed;
  }
}
