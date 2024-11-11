import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  StringSelectMenuBuilder
} from 'discord.js';
import { Command } from '../../../lib/handlers.js';
import { EMOJIS } from '../../../util/emojis.js';
import { Util } from '../../../util/toolkit.js';

export default class CapitalReminderNowCommand extends Command {
  public constructor() {
    super('capital-reminder-now', {
      aliases: ['capital-raids-reminder-now'],
      category: 'none',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'SendMessagesInThreads', 'SendMessages', 'ViewChannel'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { message: string; clans?: string }) {
    if (!args.message) return interaction.editReply(this.i18n('command.reminders.no_message', { lng: interaction.locale }));

    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans, required: true });
    if (!clans) return;

    const customIds = {
      roles: this.client.uuid(interaction.user.id),
      remaining: this.client.uuid(interaction.user.id),
      threshold: this.client.uuid(interaction.user.id),
      memberType: this.client.uuid(interaction.user.id),
      clans: this.client.uuid(interaction.user.id),
      save: this.client.uuid(interaction.user.id)
    };

    const state = {
      remaining: ['1', '2', '3', '4', '5', '6'],
      minThreshold: 5,
      allMembers: true,
      roles: ['leader', 'coLeader', 'admin', 'member'],
      clans: clans.map((clan) => clan.tag)
    };

    const mutate = (disable = false) => {
      const minThresholdRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Min. Attack Threshold')
          .setCustomId(customIds.threshold)
          .setOptions(
            Array(6)
              .fill(0)
              .map((_, i) => ({
                label: `${i + 1} minimum attack${i === 0 ? '' : 's'}${i === 5 ? ` (if eligible)` : ''}`,
                value: (i + 1).toString(),
                default: state.minThreshold === i + 1
              }))
          )
          .setDisabled(disable)
      );

      const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Min. Attacks Done')
          .setMaxValues(1)
          .setCustomId(customIds.memberType)
          .setOptions([
            {
              label: 'All Members',
              value: 'allMembers',
              description: 'With a minimum of 0 attacks done (@ping non-participants)',
              default: state.allMembers
            },
            {
              label: 'Only Participants',
              value: 'onlyParticipants',
              description: 'With a minimum of 1 attack done (@ping participants only)',
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

      return [minThresholdRow, row2, row3, row4];
    };

    const msg = await interaction.editReply({ components: mutate(), content: '**Instant Capital Reminder Options**' });
    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 5 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.remaining && action.isStringSelectMenu()) {
        state.remaining = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.threshold && action.isStringSelectMenu()) {
        state.minThreshold = Number(action.values.at(0));
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

      if (action.customId === customIds.memberType && action.isStringSelectMenu()) {
        state.allMembers = action.values.includes('allMembers');
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.save && action.isButton()) {
        await action.update({ components: [], content: `**Fetching capital raids...** ${EMOJIS.LOADING}` });

        const texts = await this.getWars(action, {
          remaining: state.remaining.map((num) => Number(num)),
          roles: state.roles,
          minThreshold: state.minThreshold,
          clans: state.clans,
          message: args.message,
          allMembers: state.allMembers
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

  public async getWars(
    interaction: ButtonInteraction<'cached'>,
    reminder: {
      roles: string[];
      remaining: number[];
      clans: string[];
      message: string;
      allMembers: boolean;
      minThreshold: number;
    }
  ) {
    const texts: string[] = [];
    for (const tag of reminder.clans) {
      const data = await this.client.capitalRaidScheduler.getLastRaidSeason(tag);
      if (!data) continue;
      const [text] = await this.client.capitalRaidScheduler.getReminderText(
        { ...reminder, guild: interaction.guild.id, linkedOnly: false },
        { tag },
        data
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
