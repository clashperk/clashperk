import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';

export default class CategoryDeleteCommand extends Command {
  public constructor() {
    super('category-delete', {
      category: 'setup',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      ephemeral: true,
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { category: string }) {
    if (!ObjectId.isValid(args.category)) return interaction.editReply('Invalid categoryId.');

    const deleted = await this.client.db.collection(Collections.CLAN_CATEGORIES).findOneAndDelete({ _id: new ObjectId(args.category) });
    if (!deleted.value) return interaction.editReply('Failed to delete the category.');

    return interaction.editReply('Successfully deleted.');
  }
}
