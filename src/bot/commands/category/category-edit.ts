import { ClanCategoriesEntity } from '@app/entities';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/_constants.js';

export default class CategoryEditCommand extends Command {
  public constructor() {
    super('category-edit', {
      category: 'setup',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      ephemeral: true,
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { category: string; category_name?: string; category_order?: number }
  ) {
    if (!ObjectId.isValid(args.category)) return interaction.editReply('Invalid categoryId.');

    const token = this.client.util.createToken({ userId: interaction.user.id, guildId: interaction.guild.id });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setURL(`https://clashperk.com/clans?token=${token}`).setLabel('Reorder').setStyle(ButtonStyle.Link)
    );

    if (!(args.category_name || args.category_order)) {
      return interaction.editReply({
        content: 'No value was provided to update the category. Would you like to reorder categories and clans?',
        components: [row]
      });
    }

    const payload: Partial<ClanCategoriesEntity> = {};
    if (args.category_order) payload.order = args.category_order;
    if (args.category_name) {
      payload.displayName = args.category_name.trim();
      payload.name = this.client.storage.formatCategoryName(args.category_name);
    }

    const alreadyExists = await this.client.db
      .collection(Collections.CLAN_CATEGORIES)
      .findOne({ guildId: interaction.guild.id, name: payload.name, _id: { $ne: new ObjectId(args.category) } });
    if (alreadyExists) {
      return interaction.editReply('A category with this name already exists.');
    }

    const categories = await this.client.storage.getOrCreateDefaultCategories(interaction.guildId);
    const lastCategory = Math.max(...categories.map((cat) => cat.order));

    if (args.category_order && args.category_order <= lastCategory) {
      const categoryIds = categories
        .filter((cat) => args.category_order && cat.order >= args.category_order)
        .map((cat) => new ObjectId(cat.value));
      if (categoryIds.length) {
        await this.client.db
          .collection(Collections.CLAN_CATEGORIES)
          .updateMany({ _id: { $in: categoryIds } }, [{ $set: { order: { $sum: ['$order', 1] } } }]);
      }
    }

    await this.client.db.collection(Collections.CLAN_CATEGORIES).updateOne({ _id: new ObjectId(args.category) }, { $set: { ...payload } });

    return interaction.editReply({
      content: '**Category name was updated.** Would you like to reorder categories and clans?',
      components: [row]
    });
  }
}
