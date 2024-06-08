import { Settings } from '@app/constants';
import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';

export default class RosterPostCommand extends Command {
  public constructor() {
    super('roster-post', {
      category: 'roster',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      roleKey: Settings.ROSTER_MANAGER_ROLE,
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { roster: string; signup_disabled: boolean }) {
    if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });
    const rosterId = new ObjectId(args.roster);
    const roster = await this.client.rosterManager.get(rosterId);
    if (!roster) return interaction.followUp({ content: 'Roster not found.', ephemeral: true });

    const updated = await this.client.rosterManager.updateMembers(roster, roster.members);
    if (!updated) return interaction.followUp({ content: 'This roster no longer exists.', ephemeral: true });

    const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

    const row = this.client.rosterManager.getRosterComponents({ roster: updated, signupDisabled: args.signup_disabled });
    const embed = this.client.rosterManager.getRosterEmbed(updated, categories);

    return interaction.editReply({ embeds: [embed], components: [row] });
  }
}
