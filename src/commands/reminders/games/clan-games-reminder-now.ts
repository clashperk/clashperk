import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  StringSelectMenuBuilder
} from 'discord.js';
import { Command } from '../../../lib/index.js';
import { CLAN_GAMES_MINIMUM_POINTS } from '../../../util/constants.js';
import { EMOJIS } from '../../../util/emojis.js';
import { Util } from '../../../util/toolkit.js';

export default class ClanGamesNowCommand extends Command {
  public constructor() {
    super('clan-games-reminder-now', {
      category: 'reminder',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'SendMessagesInThreads', 'SendMessages', 'ViewChannel'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { message: string; clans?: string }) {
    if (!args.message) return interaction.editReply(this.i18n('command.reminders.now.no_message', { lng: interaction.locale }));

    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans, required: true });
    if (!clans) return;

    const customIds = {
      roles: this.client.uuid(interaction.user.id),
      remaining: this.client.uuid(interaction.user.id),
      memberType: this.client.uuid(interaction.user.id),
      clans: this.client.uuid(interaction.user.id),
      save: this.client.uuid(interaction.user.id),
      minPoints: this.client.uuid(interaction.user.id)
    };

    const state = {
      remaining: ['1', '2', '3', '4', '5', '6'],
      allMembers: true,
      minPoints: '0',
      roles: ['leader', 'coLeader', 'admin', 'member'],
      clans: clans.map((clan) => clan.tag)
    };

    const mutate = (disable = false) => {
      const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Minimum Points')
          .setMaxValues(1)
          .setCustomId(customIds.minPoints)
          .setOptions(
            CLAN_GAMES_MINIMUM_POINTS.map((num) => ({
              label: `${num}`,
              value: num.toString(),
              default: state.minPoints === num.toString()
            }))
          )
          .setDisabled(disable)
      );

      const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Participation Type')
          .setMaxValues(1)
          .setCustomId(customIds.memberType)
          .setOptions([
            {
              label: 'All Members',
              value: 'allMembers',
              description: 'Anyone in the clan.',
              default: state.allMembers
            },
            {
              label: 'Only Participants',
              value: 'onlyParticipants',
              description: 'Anyone who earned a minimum points.',
              default: !state.allMembers
            }
          ])
          .setDisabled(disable)
      );

      const row3 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Clan Roles')
          .setCustomId(customIds.roles)
          .setMaxValues(4)
          .setOptions([
            {
              label: 'Leader',
              value: 'leader',
              default: state.roles.includes('leader')
            },
            {
              label: 'Co-Leader',
              value: 'coLeader',
              default: state.roles.includes('coLeader')
            },
            {
              label: 'Elder',
              value: 'admin',
              default: state.roles.includes('admin')
            },
            {
              label: 'Member',
              value: 'member',
              default: state.roles.includes('member')
            }
          ])
          .setDisabled(disable)
      );

      const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(customIds.save)
          .setLabel('Remind Now')
          .setEmoji('🔔')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disable)
      );

      return [row1, row2, row3, row4];
    };

    const msg = await interaction.editReply({ components: mutate(), content: '**Instant Clan Games Reminder Options**' });
    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 5 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.remaining && action.isStringSelectMenu()) {
        state.remaining = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.roles && action.isStringSelectMenu()) {
        state.roles = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.clans && action.isStringSelectMenu()) {
        state.clans = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.minPoints && action.isStringSelectMenu()) {
        state.minPoints = action.values[0];
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.memberType && action.isStringSelectMenu()) {
        state.allMembers = action.values.includes('allMembers');
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.save && action.isButton()) {
        await action.update({ components: [], content: `**Fetching capital raids...** ${EMOJIS.LOADING}` });

        const texts = await this.getText(action, {
          roles: state.roles,
          clans: state.clans,
          message: args.message,
          allMembers: state.allMembers,
          minPoints: Number(state.minPoints)
        });

        if (texts.length) {
          await action.editReply({ content: `\u200e🔔 ${args.message}` });
        } else {
          await action.editReply({ content: this.i18n('command.reminders.now.no_match', { lng: interaction.locale }) });
        }

        await this.send(action, texts);
      }
    });

    collector.on('end', async (_, reason) => {
      for (const id of Object.values(customIds)) this.client.components.delete(id);
      if (!/delete/i.test(reason)) await interaction.editReply({ components: mutate(true) });
    });
  }

  private async getText(
    interaction: ButtonInteraction<'cached'>,
    reminder: {
      roles: string[];
      clans: string[];
      minPoints: number;
      allMembers: boolean;
      message: string;
    }
  ) {
    const texts: string[] = [];
    const { endTime, startTime } = this.client.cgScheduler.timings();
    if (!(Date.now() >= startTime && Date.now() <= endTime)) return [];
    for (const tag of reminder.clans) {
      const [text] = await this.client.cgScheduler.getReminderText(
        { ...reminder, guild: interaction.guild.id, linkedOnly: false },
        { tag }
      );
      if (text) texts.push(text);
    }
    return texts;
  }

  private async send(interaction: ButtonInteraction<'cached'>, texts: string[]) {
    for (const text of texts) {
      for (const content of Util.splitMessage(text, { maxLength: 2000 })) {
        await interaction.followUp({ content, allowedMentions: { parse: ['users'] } });
      }
      await Util.delay(1000);
    }
  }
}
