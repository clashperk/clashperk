import { ClanStoresEntity } from '@app/entities';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/constants.js';
import { EMOJIS } from '../../util/_emojis.js';
import { Util } from '../../util/index.js';

export default class ClansCommand extends Command {
  public constructor() {
    super('clans', {
      category: 'setup',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { category_filter?: 'include' | 'exclude' }) {
    const clans = await this.client.storage.find(interaction.guildId);
    if (!clans.length) {
      return interaction.editReply({
        content: this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
      });
    }

    const clansMap = await this.getClansMap(clans.map((clan) => clan.tag));
    const categories = await this.getCategoriesMap(interaction.guildId);
    const categoryIds = Object.keys(categories);

    const clansReduced = clans.reduce<Record<string, ClanStoresEntity[]>>((prev, curr) => {
      let categoryId = curr.categoryId?.toHexString() || 'general';
      if (!(categoryId in categories)) categoryId = 'general';

      prev[categoryId] ??= [];
      prev[categoryId].push(curr);
      return prev;
    }, {});
    const clanGroups = Object.entries(clansReduced).sort(([a], [b]) => categoryIds.indexOf(a) - categoryIds.indexOf(b));

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
      .setColor(this.client.embed(interaction))
      .setFooter({ text: `Total ${clans.length}` });

    const clanCategoryExclusionList = this.client.settings
      .get<string[]>(interaction.guildId, Settings.CLAN_CATEGORY_EXCLUSION, [])
      .filter((id) => categories[id]);

    if (!args.category_filter && clanCategoryExclusionList.length) args.category_filter = 'exclude';

    const chunk = clanGroups
      .filter(([categoryId]) => {
        if (!args.category_filter || !clanCategoryExclusionList.length) return true;
        if (args.category_filter === 'include') {
          return clanCategoryExclusionList.includes(categoryId);
        }
        return !clanCategoryExclusionList.includes(categoryId);
      })
      .map(([categoryId, clans]) => {
        return [
          `**${categories[categoryId] || 'General'}**`,
          ...clans.map((clan) => {
            const mem = clansMap[clan.tag] || 0;
            const tag = clan.tag.replace('#', '');
            return `[\u200e${clan.nickname || clan.name} [${clan.tag}] - ${mem}](http://cprk.eu/c/${tag})`;
          })
        ].join('\n');
      })
      .join('\n\n');

    const [description, ...fields] = Util.splitMessage(chunk, { maxLength: 4096 });
    embed.setDescription(description);

    for (const field of fields) {
      embed.addFields({ name: '\u200b', value: field });
    }

    const payload = {
      cmd: this.id
    };
    const customIds = {
      switch: this.createId({ ...payload, category_filter: args.category_filter === 'exclude' ? 'include' : 'exclude' }),
      refresh: this.createId({ ...payload })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.refresh).setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary)
    );
    if (args.category_filter && clanCategoryExclusionList.length) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(customIds.switch)
          .setLabel(args.category_filter === 'exclude' ? 'Secondary' : 'Primary')
          .setStyle(args.category_filter === 'exclude' ? ButtonStyle.Secondary : ButtonStyle.Primary)
      );
    }

    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async getCategoriesMap(guildId: string) {
    const categories = await this.client.storage.getOrCreateDefaultCategories(guildId);
    return Object.fromEntries(categories.map((cat) => [cat.value, cat.name]));
  }

  private async getClansMap(clanTags: string[]) {
    const clans = await this.client.redis.getClans(clanTags);
    return Object.fromEntries(clans.map((clan) => [clan.tag, clan.members]));
  }
}
