import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder
} from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { createInteractionCollector } from '../../util/pagination.js';

export default class ClanSearchCommand extends Command {
  public constructor() {
    super('clan-search', {
      aliases: ['search'],
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { name?: string }) {
    if (!args.name) {
      return interaction.editReply(
        this.i18n('command.search.no_results', { lng: interaction.locale })
      );
    }
    const { body, res } = await this.client.coc.getClans({ name: args.name, limit: 100 });
    if (!(res.ok && body.items.length)) {
      return interaction.editReply(
        this.i18n('command.search.no_results', { lng: interaction.locale })
      );
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(this.i18n('command.search.searching', { lng: interaction.locale, name: args.name }))
      .setDescription(
        [
          body.items
            .slice(0, 10)
            .map((clan) => {
              const clanType = clan.type
                .replace(/inviteOnly/g, 'Invite Only')
                .replace(/closed/g, 'Closed')
                .replace(/open/g, 'Open');
              return [
                `**[${clan.name} (${clan.tag})](https://www.clashofstats.com/clans/${clan.tag.slice(1)})**`,
                `${clan.clanLevel} level, ${clan.members} member${clan.members > 1 ? 's' : ''}, ${clan.clanPoints} points`,
                `${clanType}, ${clan.requiredTrophies} required${clan.location ? `, ${clan.location.name}` : ''}`
              ].join('\n');
            })
            .join('\n\n')
        ].join('\n')
      );

    const customIds = {
      next: this.client.uuid()
    };

    const items = body.items as APIClan[];
    const row = new ActionRowBuilder<StringSelectMenuBuilder>();
    row.setComponents(
      this.paginatedMenu(items, 0, customIds).setPlaceholder(
        `Page ${1} of ${Math.ceil(items.length / 25)} (Total: ${items.length})`
      )
    );

    const message = await interaction.editReply({
      embeds: [embed],
      components: this.client.isOwner(interaction.user.id) ? [row] : []
    });

    createInteractionCollector({
      customIds,
      interaction,
      message,
      onSelect: async (action) => {
        const pageIndex = Number(action.values[0]);
        action.values.lastIndexOf(`${pageIndex + 1}`);
        const newRow = new ActionRowBuilder<StringSelectMenuBuilder>();
        const menu = this.paginatedMenu(items, pageIndex, customIds).setPlaceholder(
          `Page ${pageIndex + 1} of ${Math.ceil(items.length / 25)} (Total: ${items.length})`
        );
        newRow.setComponents(menu);

        await action.update({ components: [newRow] });
      }
    });
  }

  private paginatedMenu(
    items: APIClan[],
    pageIndex: number,
    customIds: Record<string, string>
  ): StringSelectMenuBuilder {
    const perPage = items.length <= 25 ? items.length : pageIndex === 0 ? 24 : 23;

    const options: MenuType[] = items
      .slice(pageIndex, perPage)
      .map((item) => ({ value: item.tag, label: `${item.name} (${item.tag})` }));
    if (pageIndex > 0) {
      options.unshift({
        value: `${pageIndex - 1}`,
        label: 'Previous',
        emoji: '◀️',
        description: 'Load previous page of results'
      });
    }
    if (items.length > 25 && items.length > perPage) {
      options.push({
        value: `${pageIndex + 1}`,
        label: 'Next',
        emoji: '▶️',
        description: 'Load next page of results'
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(customIds.next)
      .setPlaceholder('Items')
      .setOptions(options)
      .setMaxValues(options.length);

    return menu;
  }
}

interface MenuType {
  value: string;
  label: string;
  emoji?: string;
  description?: string;
}
