import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { ClanCategories } from '../../struct/StorageHandler.js';
import { Collections } from '../../util/Constants.js';

export default class CategoryCreateCommand extends Command {
	public constructor() {
		super('category-create', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { category_name: string; category_order?: number }) {
		const formattedName = this.client.storage.formatCategoryName(args.category_name);

		const collection = this.client.db.collection<ClanCategories>(Collections.CLAN_CATEGORIES);

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

		return interaction.editReply('Category created.');
	}
}
