import { Settings } from '@app/constants';
import { CommandInteraction, MessageFlags } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/handlers.js';
import { dynamicPagination } from '../../util/pagination.js';

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

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { roster: string; signup_disabled: boolean; page?: number }
  ) {
    if (!ObjectId.isValid(args.roster))
      return interaction.followUp({ content: 'Invalid roster ID.', flags: MessageFlags.Ephemeral });
    const rosterId = new ObjectId(args.roster);
    const roster = await this.client.rosterManager.get(rosterId);
    if (!roster)
      return interaction.followUp({ content: 'Roster not found.', flags: MessageFlags.Ephemeral });
    if (roster.guildId !== interaction.guildId && !this.client.isOwner(interaction.user)) {
      return interaction.followUp({ content: 'Roster not found.', flags: MessageFlags.Ephemeral });
    }

    const updated =
      Date.now() - roster.lastUpdated.getTime() < 30 * 1000 && roster.members.length >= 65
        ? roster
        : await this.client.rosterManager.updateMembers(roster, roster.members);
    if (!updated)
      return interaction.followUp({
        content: 'This roster no longer exists.',
        flags: MessageFlags.Ephemeral
      });

    const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

    const row = this.client.rosterManager.getRosterComponents({
      roster: updated,
      signupDisabled: args.signup_disabled
    });
    const embeds = this.client.rosterManager.getRosterEmbed(updated, categories, true);

    if (embeds.length > 1) {
      const props = {
        cmd: this.id,
        page: args.page,
        signup_disabled: args.signup_disabled,
        roster: roster._id.toHexString()
      };
      return dynamicPagination(interaction, embeds, props, [row]);
    }

    return interaction.editReply({ embeds, components: [row] });
  }
}
