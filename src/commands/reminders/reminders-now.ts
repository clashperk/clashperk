import { CLAN_GAMES_MINIMUM_POINTS, MAX_TOWN_HALL_LEVEL } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  StringSelectMenuBuilder
} from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { Util } from '../../util/toolkit.js';

export default class RemindersNowCommand extends Command {
  public constructor() {
    super('reminders-now', {
      category: 'reminders',
      userPermissions: ['ManageGuild'],
      channel: 'guild',
      defer: true
    });
  }

  public exec(interaction: CommandInteraction<'cached'>, args: { command: string; type: string } & { message: string; clans?: string }) {
    const command = {
      'clan-wars': this.clanWarsReminders.bind(this),
      'clan-games': this.clanGamesReminders.bind(this),
      'capital-raids': this.capitalReminders.bind(this)
    }[args.type];
    if (!command) throw Error(`Command "${args.type}" not found.`);

    return command(interaction, args);
  }

  private async clanWarsReminders(interaction: CommandInteraction<'cached'>, args: { message: string; clans?: string }) {
    if (!args.message) return interaction.editReply(this.i18n('command.reminders.no_message', { lng: interaction.locale }));

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

        const [texts] = await this.getClanWarsTexts(action, {
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

        await this.send(action, texts);
      }
    });

    collector.on('end', async (_, reason) => {
      for (const id of Object.values(CUSTOM_ID)) this.client.components.delete(id);
      if (!/delete/i.test(reason)) await interaction.editReply({ components: mutate(true) });
    });
  }

  private async clanGamesReminders(interaction: CommandInteraction<'cached'>, args: { message: string; clans?: string }) {
    if (!args.message) return interaction.editReply(this.i18n('command.reminders.no_message', { lng: interaction.locale }));

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

        const texts = await this.getClanGamesTexts(action, {
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

  private async capitalReminders(interaction: CommandInteraction<'cached'>, args: { message: string; clans?: string }) {
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

        const texts = await this.getCapitalTexts(action, {
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

  private async getClanWarsTexts(
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
      const currentWars = await this.client.coc.getCurrentWars(tag);
      for (const data of currentWars) {
        if (['notInWar', 'warEnded', 'preparation'].includes(data.state)) continue;

        const warType = data.warTag ? 'cwl' : data.isFriendly ? 'friendly' : 'normal';
        if (!reminder.warTypes.includes(warType)) continue;

        const [text, _userIds] = await this.client.clanWarScheduler.getReminderText(
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

  private async getClanGamesTexts(
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
    const { endTime, startTime } = this.client.clanGamesScheduler.timings();
    if (!(Date.now() >= startTime && Date.now() <= endTime)) return [];
    for (const tag of reminder.clans) {
      const [text] = await this.client.clanGamesScheduler.getReminderText(
        { ...reminder, guild: interaction.guild.id, linkedOnly: false },
        { tag }
      );
      if (text) texts.push(text);
    }
    return texts;
  }

  public async getCapitalTexts(
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
        await interaction.followUp({
          content,
          allowedMentions: { parse: ['users'] }
        });
      }
      await Util.delay(1000);
    }
  }
}
