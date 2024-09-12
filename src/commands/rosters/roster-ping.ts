import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/constants.js';
import { nullsLastSortAlgo } from '../../util/helper.js';
import { createInteractionCollector } from '../../util/pagination.js';
import { Util } from '../../util/index.js';

export default class RosterPingCommand extends Command {
  public constructor() {
    super('roster-ping', {
      category: 'roster',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'SendMessagesInThreads', 'SendMessages', 'ViewChannel'],
      roleKey: Settings.ROSTER_MANAGER_ROLE,
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { roster: string; ping_option?: 'unregistered' | 'missing' | 'everyone'; group?: string; message?: string }
  ) {
    if (!(args.ping_option || args.group)) return interaction.editReply('Please provide a ping option or a user-group.');
    if (!ObjectId.isValid(args.roster)) return interaction.editReply({ content: 'Invalid roster ID.' });

    const rosterId = new ObjectId(args.roster);
    const roster = await this.client.rosterManager.get(rosterId);
    if (!roster) return interaction.editReply({ content: 'Roster not found.' });

    if (!roster.clan) {
      return interaction.editReply({
        content: `This roster does not have a clan linked to it.`
      });
    }

    const { body: clan, res } = await this.client.http.getClan(roster.clan.tag);
    if (!res.ok) return interaction.editReply({ content: `Failed to fetch the clan \u200e${roster.clan.name} (${roster.clan.tag})` });

    const updated = await this.client.rosterManager.updateMembers(roster, roster.members);
    if (!updated) return interaction.editReply({ content: 'This roster no longer exists.' });

    // close all rosters that should be closed
    this.client.rosterManager.closeRosters(interaction.guild.id);

    const msgText = `\u200e**${roster.name} - ${roster.clan.name} (${roster.clan.tag})** ${args.message ? `\n\n${args.message}` : ''}`;

    if (args.group) {
      const groupMembers = updated.members.filter((member) => member.categoryId && member.categoryId.toHexString() === args.group);
      if (!groupMembers.length) return interaction.editReply({ content: 'No members found in this group.' });

      groupMembers.sort((a, b) => nullsLastSortAlgo(a.userId, b.userId));
      const result = groupMembers.map((member) => {
        return { name: `${member.name} (${member.tag})`, mention: `${member.userId ? `<@${member.userId}>` : ''}` };
      });

      return this.followUp(interaction, msgText, result);
    }

    if (args.ping_option === 'unregistered') {
      const unregisteredMembers = clan.memberList.filter((member) => !updated.members.some((m) => m.tag === member.tag));
      if (!unregisteredMembers.length) return interaction.editReply({ content: 'No unregistered members found.' });

      const members = await this.client.rosterManager.getClanMembers(unregisteredMembers, true);
      if (!members.length) return interaction.editReply({ content: 'No unregistered members found.' });

      members.sort((a, b) => nullsLastSortAlgo(a.userId, b.userId));
      const result = members.map((member) => {
        return { name: `${member.name} (${member.tag})`, mention: `${member.userId ? `<@${member.userId}>` : ''}` };
      });
      return this.followUp(interaction, msgText, result);
    }

    if (args.ping_option === 'missing') {
      const missingMembers = updated.members.filter((member) => !member.clan || member.clan.tag !== clan.tag);
      if (!missingMembers.length) return interaction.editReply({ content: 'No missing members found.' });

      missingMembers.sort((a, b) => nullsLastSortAlgo(a.userId, b.userId));
      const result = missingMembers.map((member) => {
        return { name: `${member.name} (${member.tag})`, mention: `${member.userId ? `<@${member.userId}>` : ''}` };
      });

      return this.followUp(interaction, msgText, result);
    }

    const result = updated.members.map((member) => {
      return { name: `${member.name} (${member.tag})`, mention: `${member.userId ? `<@${member.userId}>` : ''}` };
    });
    return this.followUp(interaction, msgText, result);
  }

  private async followUp(interaction: CommandInteraction<'cached'>, msgText: string, result: { name: string; mention: string }[]) {
    const customIds = {
      confirm: this.client.uuid(interaction.user.id)
    };
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.confirm).setLabel('Confirm and Ping').setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.editReply({
      content: `${msgText}\n${result.map((m) => `0. \u200e${m.name}`).join('\n')}`,
      components: interaction.ephemeral ? [] : [row],
      allowedMentions: { parse: [] }
    });

    createInteractionCollector({
      message,
      customIds,
      interaction,
      onClick: async (action) => {
        await action.update({ components: [], content: `${msgText}\nPinging ${result.length} members` });

        for (const content of Util.splitMessage(`${msgText}\n${result.map((m) => `- \u200e${m.name} ${m.mention}`).join('\n')}`, {
          maxLength: 2000
        })) {
          await action.followUp({ content });
        }
      }
    });
  }
}
