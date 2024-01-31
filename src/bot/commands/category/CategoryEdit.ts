import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { ClanCategories } from '../../struct/StorageHandler.js';
import { Collections } from '../../util/Constants.js';

export default class CategoryEditCommand extends Command {
	public constructor() {
		super('category-edit', {
			category: 'none',
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

		if (args.category_name && args.category_order) {
			return interaction.editReply('Failed to update the category (no name or order was provided)');
		}

		const payload: Partial<ClanCategories> = {};
		if (args.category_order) payload.order = args.category_order;
		if (args.category_name) {
			payload.displayName = args.category_name.trim();
			payload.name = this.client.storage.formatCategoryName(args.category_name);
		}

		const alreadyExists = await this.client.db
			.collection(Collections.CLAN_CATEGORIES)
			.findOne({ name: payload.name, _id: { $ne: new ObjectId(args.category) } });
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

		await this.client.db
			.collection(Collections.CLAN_CATEGORIES)
			.updateOne({ _id: new ObjectId(args.category), name: { $ne: payload.name } }, { $set: { ...payload } });

		return interaction.editReply('Category updated.');
	}
}
