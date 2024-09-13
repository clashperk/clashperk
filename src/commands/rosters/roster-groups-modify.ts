import { Settings } from '@app/constants';
import { CommandInteraction, Role } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/handlers.js';
import { IRosterCategory } from '../../struct/roster-manager.js';

interface RosterGroupModifyProps {
  command: 'modify';
  group: string;
  name?: string;
  order?: number;
  selectable?: boolean;
  group_role?: Role;
  delete_role?: boolean;
  delete_group?: boolean;
}

export default class RosterGroupsModifyCommand extends Command {
  public constructor() {
    super('roster-groups-modify', {
      category: 'roster',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      roleKey: Settings.ROSTER_MANAGER_ROLE,
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: RosterGroupModifyProps) {
    if (!ObjectId.isValid(args.group)) {
      return interaction.editReply({ content: 'Invalid group ID.' });
    }

    const categoryId = new ObjectId(args.group);
    const category = await this.client.rosterManager.getCategory(categoryId);
    if (!category) return interaction.editReply({ content: 'User group was deleted.' });

    if (args.delete_group) {
      await this.client.rosterManager.deleteCategory(category._id);
      return interaction.editReply({ content: 'User group deleted!' });
    }

    const data: Partial<IRosterCategory> = {};

    if (args.name) {
      const category = await this.client.rosterManager.searchCategory(interaction.guild.id, args.name);
      if (category) return interaction.editReply({ content: 'A group with this name already exists.' });
    }

    if (args.name) data.displayName = args.name;
    if (args.selectable) data.selectable = args.selectable;
    if (args.group_role) data.roleId = args.group_role.id;
    if (args.delete_role) data.roleId = null;
    if (args.order) data.order = args.order;

    if (args.group_role) {
      const dup = await this.client.rosterManager.categories.findOne({ _id: { $ne: category._id }, roleId: args.group_role.id });
      if (dup) return interaction.editReply({ content: 'A category with this role already exists.' });
    }

    await this.client.rosterManager.editCategory(category._id, data);
    return interaction.editReply({ content: 'User group updated!' });
  }
}
