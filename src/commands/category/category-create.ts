import { Collections } from '@app/constants';
import { ClanCategoriesEntity } from '@app/entities';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/handlers.js';

export default class CategoryCreateCommand extends Command {
  public constructor() {
    super('category-create', {
      category: 'setup',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { category_name: string; category_order?: number }) {
    const formattedName = this.client.storage.formatCategoryName(args.category_name);

    const collection = this.client.db.collection<ClanCategoriesEntity>(Collections.CLAN_CATEGORIES);

    const alreadyExists = await collection.findOne({ guildId: interaction.guildId, name: formattedName });
    if (alreadyExists) {
      return interaction.editReply('A category with this name already exists.');
    }

    const categories = await this.client.storage.getOrCreateDefaultCategories(interaction.guildId);
    const lastCategory = Math.max(...categories.map((cat) => cat.order));

    await collection.insertOne({
      guildId: interaction.guildId,
      name: formattedName,
      displayName: args.category_name.trim(),
      order: args.category_order ?? lastCategory + 1
    });

    if (args.category_order && args.category_order <= lastCategory) {
      const categoryIds = categories
        .filter((cat) => args.category_order && cat.order >= args.category_order)
        .map((cat) => new ObjectId(cat.value));
      if (categoryIds.length) {
        await collection.updateMany({ _id: { $in: categoryIds } }, [{ $set: { order: { $sum: ['$order', 1] } } }]);
      }
    }

    const token = this.client.util.createToken({ userId: interaction.user.id, guildId: interaction.guild.id });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setURL(`https://clashperk.com/clans?token=${token}`).setLabel('Reorder').setStyle(ButtonStyle.Link)
    );

    return interaction.editReply({ content: 'Category created.', components: [row] });
  }
}
