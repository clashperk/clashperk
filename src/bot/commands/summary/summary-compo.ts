import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder } from 'discord.js';
import { cluster } from 'radash';
import { Command } from '../../lib/index.js';
import { padStart } from '../../util/helper.js';
import { handlePagination } from '../../util/pagination.js';

export default class SummaryCompoCommand extends Command {
  public constructor() {
    super('summary-compo', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const clans = await this.client.storage.find(interaction.guildId);
    if (!clans.length) {
      return interaction.editReply(
        this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
      );
    }

    const _clans = await this.client.http._getClans(clans);

    const overall: { tag: string; townHallLevel: number }[] = [];
    const aggregated: { name: string; tag: string; weight: number; compo: Record<string, number> }[] = [];

    for (const clan of _clans) {
      const players = clan.memberList.map((mem) => ({ tag: mem.tag, townHallLevel: mem.townHallLevel }));
      overall.push(...players);

      const reduced = players.reduce<{ [key: string]: number }>((count, member) => {
        const townHall = member.townHallLevel;
        count[townHall] = (count[townHall] || 0) + 1;
        return count;
      }, {});
      const townHalls = Object.entries(reduced)
        .map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
        .sort((a, b) => b.level - a.level);
      const weight = townHalls.reduce((p, c) => p + c.level ** c.total, 0);

      aggregated.push({ name: clan.name, tag: clan.tag, weight, compo: reduced });
    }

    aggregated.sort((a, b) => b.weight - a.weight);

    const embed = new EmbedBuilder();
    embed.addFields([{ name: 'Overall Family Compo', value: this.compo(overall) }]);

    const customIds = {
      action: this.client.uuid(),
      active: this.client.uuid()
    };
    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setLabel("Show All Clan's Compo").setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector<ComponentType.Button>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 5 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.action) {
        await action.deferUpdate();

        const embeds = [];
        for (const clans of cluster(aggregated, 25)) {
          const embed = new EmbedBuilder().setTitle('Family TownHall Compo');
          embed.setDescription(clans.map((clan) => `**${clan.name} (${clan.tag})**\n${this.fromReduced(clan.compo)}`).join('\n\n'));
          embeds.push(embed);
        }

        return handlePagination(action, embeds);
      }
    });

    collector.on('end', async (_, reason) => {
      for (const id of Object.values(customIds)) this.client.components.delete(id);
      if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
    });
  }

  private compo(players: { tag: string; townHallLevel: number }[]) {
    const reduced = players.reduce<{ [key: string]: number }>((count, member) => {
      const townHall = member.townHallLevel;
      count[townHall] = (count[townHall] || 0) + 1;
      return count;
    }, {});

    return this.fromReduced(reduced);
  }

  private fromReduced(reduced: Record<string, number>) {
    const townHalls = Object.entries(reduced)
      .map((arr) => ({ level: Number(arr.at(0)), total: Number(arr.at(1)) }))
      .sort((a, b) => b.level - a.level);

    const total = townHalls.reduce((p, c) => p + c.total, 0);
    const avg = townHalls.reduce((p, c) => p + c.total * c.level, 0) / total || 0;

    return [
      '```',
      'TH   COUNT',
      townHalls.map((th) => `${padStart(th.level, 2)}   ${padStart(th.total, 2)}`).join('\n'),
      `\`\`\`Total: ${total} | Avg. ${avg.toFixed(2)}`
    ].join('\n');
  }
}
