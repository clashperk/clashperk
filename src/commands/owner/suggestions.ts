import { ChannelType, EmbedBuilder, Message } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class SuggestionsCommand extends Command {
  public constructor() {
    super('suggestions', {
      category: 'owner',
      ownerOnly: true,
      defer: false
    });
  }

  public async run(message: Message<true>) {
    const channel = message.guild.channels.cache.get('1020177547092307999');
    if (!channel || channel?.type !== ChannelType.GuildForum) return;

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
      'In Progress': 0,
      'API Limitation': 0,
      'Feature Exists': 0
    };

    channel.availableTags.forEach((tag) => {
      const threadsWithTag = threads.filter((thread) => thread.appliedTags.includes(tag.id));
      Object.assign(record, { [tag.name]: threadsWithTag.size });
    });
    record.Pending = record.High + record.Medium;

    const embed = new EmbedBuilder();
    embed.setColor(this.client.embed(message));
    embed.setTitle('Suggestions');
    embed.setDescription(
      Object.entries(record)
        .map(([key, value]) => {
          const lineBreak = key === 'Pending' || key === 'Medium' || key === 'Total' ? '\n' : '';
          return `${key}: ${value}${lineBreak}`;
        })
        .join('\n')
    );

    return message.channel.send({ embeds: [embed] });
  }
}
