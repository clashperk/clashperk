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
import { MAX_TOWN_HALL_LEVEL } from '../../../util/constants.js';
import { EMOJIS } from '../../../util/emojis.js';
import { Util } from '../../../util/toolkit.js';

export default class ReminderNowCommand extends Command {
  public constructor() {
    super('clan-wars-reminder-now', {
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

    const CUSTOM_ID = {
      ROLES: this.client.uuid(interaction.user.id),
      TOWN_HALLS: this.client.uuid(interaction.user.id),
      REMAINING: this.client.uuid(interaction.user.id),
      CLANS: this.client.uuid(interaction.user.id),
      SAVE: this.client.uuid(interaction.user.id),
      WAR_TYPE: this.client.uuid(interaction.user.id)
    };

    const state = {
      remaining: ['1', '2'],
      townHalls: Array(MAX_TOWN_HALL_LEVEL - 1)
        .fill(0)
        .map((_, i) => (i + 2).toString()),
      roles: ['leader', 'coLeader', 'admin', 'member'],
      warTypes: ['cwl', 'normal', 'friendly'],
      clans: clans.map((clan) => clan.tag)
    };

    const mutate = (disable = false) => {
      const row0 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select War Types')
          .setMaxValues(3)
          .setCustomId(CUSTOM_ID.WAR_TYPE)
          .setOptions([
            {
              label: 'Normal',
              value: 'normal',
              default: state.warTypes.includes('normal')
            },
            {
              label: 'Friendly',
              value: 'friendly',
              default: state.warTypes.includes('friendly')
            },
            {
              label: 'CWL',
              value: 'cwl',
              default: state.warTypes.includes('cwl')
            }
          ])
          .setDisabled(disable)
      );

      const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Attacks Remaining')
          .setMaxValues(2)
          .setCustomId(CUSTOM_ID.REMAINING)
          .setOptions([
            {
              description: '1 Attack Remaining',
              label: '1 Remaining',
              value: '1',
              default: state.remaining.includes('1')
            },
            {
              description: '2 Attacks Remaining',
              label: '2 Remaining',
              value: '2',
              default: state.remaining.includes('2')
            }
          ])
          .setDisabled(disable)
      );
      const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Town Halls')
          .setCustomId(CUSTOM_ID.TOWN_HALLS)
          .setMaxValues(MAX_TOWN_HALL_LEVEL - 1)
          .setOptions(
            Array(MAX_TOWN_HALL_LEVEL - 1)
              .fill(0)
              .map((_, i) => {
                const hall = (i + 2).toString();
                return {
                  value: hall,
                  label: hall,
                  description: `Town Hall ${hall}`,
                  default: state.townHalls.includes(hall)
                };
              })
          )
          .setDisabled(disable)
      );

      const row3 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Clan Roles')
          .setCustomId(CUSTOM_ID.ROLES)
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
          .setCustomId(CUSTOM_ID.SAVE)
          .setLabel('Remind Now')
          .setEmoji('🔔')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disable)
      );

      return [row0, row1, row2, row3, row4];
    };

    const msg = await interaction.editReply({
      components: mutate(),
      content: [`**Instant War Reminder Options**`, '', clans.map((clan) => clan.name).join(', ')].join('\n')
    });
    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
      time: 5 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === CUSTOM_ID.WAR_TYPE && action.isStringSelectMenu()) {
        state.warTypes = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === CUSTOM_ID.REMAINING && action.isStringSelectMenu()) {
        state.remaining = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === CUSTOM_ID.TOWN_HALLS && action.isStringSelectMenu()) {
        state.townHalls = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === CUSTOM_ID.ROLES && action.isStringSelectMenu()) {
        state.roles = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === CUSTOM_ID.CLANS && action.isStringSelectMenu()) {
        state.clans = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === CUSTOM_ID.SAVE && action.isButton()) {
        await action.update({ components: [], content: `**Fetching wars...** ${EMOJIS.LOADING}` });

        const [texts, userIds] = await this.getWars(action, {
          remaining: state.remaining.map((num) => Number(num)),
          townHalls: state.townHalls.map((num) => Number(num)),
          roles: state.roles,
          clans: state.clans,
          message: args.message,
          warTypes: state.warTypes
        });

        if (texts.length) {
          await action.editReply({ content: `\u200e🔔 ${args.message}` });
        } else {
          await action.editReply({ content: this.i18n('command.reminders.now.no_match', { lng: interaction.locale }) });
        }

        await this.send(action, texts, userIds);
      }
    });

    collector.on('end', async (_, reason) => {
      for (const id of Object.values(CUSTOM_ID)) this.client.components.delete(id);
      if (!/delete/i.test(reason)) await interaction.editReply({ components: mutate(true) });
    });
  }

  public async getWars(
    interaction: ButtonInteraction<'cached'>,
    reminder: {
      roles: string[];
      townHalls: number[];
      remaining: number[];
      clans: string[];
      message: string;
      warTypes: string[];
    }
  ) {
    const texts: string[] = [];
    const userIds: string[] = [];
    for (const tag of reminder.clans) {
      const currentWars = await this.client.http.getCurrentWars(tag);
      for (const data of currentWars) {
        if (['notInWar', 'warEnded', 'preparation'].includes(data.state)) continue;

        const warType = data.warTag ? 'cwl' : data.isFriendly ? 'friendly' : 'normal';
        if (!reminder.warTypes.includes(warType)) continue;

        const [text, _userIds] = await this.client.warScheduler.getReminderText(
          { ...reminder, guild: interaction.guild.id, smartSkip: false, linkedOnly: false },
          { tag: data.clan.tag, warTag: data.warTag },
          data
        );

        if (text) {
          texts.push(text);
          userIds.push(..._userIds);
        }
      }
    }
    return [texts, userIds];
  }

  private async send(interaction: ButtonInteraction<'cached'>, texts: string[], _userIds: string[]) {
    for (const text of texts) {
      for (const content of Util.splitMessage(text, { maxLength: 2000 })) {
        await interaction.followUp({
          content,
          allowedMentions: { parse: ['users'] }
        });
      }
      await Util.delay(1000);
    }
  }
}
