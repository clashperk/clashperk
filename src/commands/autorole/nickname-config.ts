import { Settings } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ContainerBuilder,
  DiscordjsError,
  DiscordjsErrorCodes,
  escapeMarkdown,
  ModalBuilder,
  SectionBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { title } from 'radash';
import { NicknamingAccountPreference } from '../../core/roles-manager.js';
import { Command } from '../../lib/handlers.js';
import { createInteractionCollector } from '../../util/pagination.js';

// {NAME} | {PLAYER_NAME}
// {TH} | {TOWN_HALL}
// {TH_SMALL} | {TOWN_HALL_SMALL}
// {ROLE} | {CLAN_ROLE}
// {ALIAS} | {CLAN_ALIAS}
// {ALIASES} | {CLAN_ALIASES}
// {CLAN} | {CLAN_NAME}
// {DISCORD} | {DISCORD_NAME}
// {USERNAME} | {DISCORD_USERNAME}

export default class NicknameConfigCommand extends Command {
  public constructor() {
    super('nickname-config', {
      category: 'roles',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'ManageNicknames'],
      defer: true,
      ephemeral: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      change_nicknames?: boolean;
      family_nickname_format?: string;
      non_family_nickname_format?: string;
      account_preference_for_naming?: NicknamingAccountPreference;
    }
  ) {
    let familyFormat = this.client.settings.get<string>(interaction.guildId, Settings.FAMILY_NICKNAME_FORMAT, '');
    if (args.family_nickname_format && familyFormat !== args.family_nickname_format) familyFormat = args.family_nickname_format;

    let nonFamilyFormat = this.client.settings.get<string>(interaction.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT, '');
    if (args.non_family_nickname_format && nonFamilyFormat !== args.non_family_nickname_format)
      nonFamilyFormat = args.non_family_nickname_format;

    if (args.family_nickname_format && !/^none$/i.test(args.family_nickname_format)) {
      if (/{NAME}|{PLAYER_NAME}|{DISCORD_NAME}|{DISCORD_USERNAME}|{USERNAME}|{DISCORD}/gi.test(familyFormat)) {
        this.client.settings.set(interaction.guildId, Settings.FAMILY_NICKNAME_FORMAT, familyFormat);
      } else {
        return interaction.editReply(
          `Invalid **family nickname** format \`${familyFormat}\`, it must include \`{PLAYER_NAME}\` or \`{DISCORD_NAME}\` or \`{DISCORD_USERNAME}\``
        );
      }
    }

    if (args.family_nickname_format && /^none$/i.test(args.family_nickname_format)) {
      this.client.settings.set(interaction.guildId, Settings.FAMILY_NICKNAME_FORMAT, '');
    }

    if (args.non_family_nickname_format && !/^none$/i.test(args.non_family_nickname_format)) {
      if (/{CLAN}|{CLAN_NAME}|{ALIAS}|{CLAN_ALIAS}|{ALIASES}|{CLAN_ALIASES}|{ROLE}|{CLAN_ROLE}/gi.test(nonFamilyFormat)) {
        return interaction.editReply(
          `Invalid **non-family nickname** format \`${nonFamilyFormat}\`, it must **not** include \`{CLAN}\` \`{CLAN_NAME}\` \`{ALIAS}\` \`{CLAN_ALIAS}\` \`{ROLE}\` \`{CLAN_ROLE}\``
        );
      } else if (!/{NAME}|{PLAYER_NAME}|{DISCORD_NAME}|{DISCORD_USERNAME}|{USERNAME}|{DISCORD}/gi.test(nonFamilyFormat)) {
        return interaction.editReply(
          `Invalid **non-family nickname** format \`${nonFamilyFormat}\`, it must include \`{PLAYER_NAME}\` or \`{DISCORD_NAME}\` or \`{DISCORD_USERNAME}\``
        );
      } else {
        this.client.settings.set(interaction.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT, nonFamilyFormat);
      }
    }

    if (args.non_family_nickname_format && /^none$/i.test(args.non_family_nickname_format)) {
      this.client.settings.set(interaction.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT, '');
    }

    if (typeof args.change_nicknames === 'boolean') {
      await this.client.settings.set(interaction.guildId, Settings.AUTO_NICKNAME, Boolean(args.change_nicknames));
    }
    const enabledAuto = this.client.settings.get<boolean>(interaction.guildId, Settings.AUTO_NICKNAME, false);

    if (args.account_preference_for_naming) {
      await this.client.settings.set(interaction.guildId, Settings.NICKNAMING_ACCOUNT_PREFERENCE, args.account_preference_for_naming);
    }

    const accountPreference = this.client.settings.get<NicknamingAccountPreference>(
      interaction.guildId,
      Settings.NICKNAMING_ACCOUNT_PREFERENCE,
      NicknamingAccountPreference.DEFAULT_OR_BEST_ACCOUNT
    );

    const state = this.client.settings.get<Partial<{ leader: string; coLeader: string; admin: string; member: string }>>(
      interaction.guild,
      Settings.ROLE_REPLACEMENT_LABELS,
      {}
    );

    const container = new ContainerBuilder();
    container.setAccentColor(this.client.embed(interaction)!);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## Server Nickname Settings'));

    const settings = [
      { name: 'Family Nickname Format', value: `\`${familyFormat || 'None'}\`` },
      { name: 'Non-Family Nickname Format', value: `\`${nonFamilyFormat || 'None'}\`` },
      { name: 'Change Nicknames', value: `\`${enabledAuto ? 'Yes' : 'No'}\`` },
      { name: 'Account Preference', value: `\`${title(accountPreference)}\`` }
    ];
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(settings.map((config) => `**${config.name}**\n${config.value}`).join('\n'))
    );

    container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

    const customIds = {
      labels: this.client.uuid(),
      leader: this.client.uuid(),
      coLeader: this.client.uuid(),
      admin: this.client.uuid(),
      member: this.client.uuid()
    };

    const labelButton = new ButtonBuilder().setLabel('Set Role Labels').setCustomId(customIds.labels).setStyle(ButtonStyle.Secondary);
    const labelsText = new TextDisplayBuilder();
    const section = new SectionBuilder();

    const mutateLabelsText = () => {
      labelsText.setContent(
        [
          '**Role Labels**',
          `- \`Leader    \`: ${escapeMarkdown(state.leader || 'Lead')}`,
          `- \`Co-Leader \`: ${escapeMarkdown(state.coLeader || 'Co-Lead')}`,
          `- \`Elder     \`: ${escapeMarkdown(state.admin || 'Eld')}`,
          `- \`Member    \`: ${escapeMarkdown(state.member || 'Mem')}`
        ].join('\n')
      );
    };
    mutateLabelsText();

    section.addTextDisplayComponents(labelsText).setButtonAccessory(labelButton);
    container.addSectionComponents(section);
    container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '**Available Variables**',
          `- \`{NAME}\` or \`{PLAYER_NAME}\``,
          `- \`{TH}\` or \`{TOWN_HALL}\``,
          `- \`{TH_SMALL}\` or \`{TOWN_HALL_SMALL}\``,
          `- \`{ROLE}\` or \`{CLAN_ROLE}\``,
          `- \`{ALIAS}\` or \`{CLAN_ALIAS}\``,
          `- \`{ALIASES}\` or \`{CLAN_ALIASES}\``,
          `- \`{CLAN}\` or \`{CLAN_NAME}\``,
          `- \`{DISCORD}\` or \`{DISCORD_NAME}\``,
          `- \`{USERNAME}\` or \`{DISCORD_USERNAME}\``,
          '',
          '**Example Formats**',
          `- \`{NAME} | {TH} | {ROLE}\``,
          `- \`{ROLE} | {TH} | {NAME}\``,
          `- \`{NAME} | {TH} | {ALIAS}\``,
          '',
          `Run ${this.client.commands.AUTOROLE_REFRESH} to refresh nicknames.`
        ].join('\n')
      )
    );

    const message = await interaction.editReply({ components: [container], withComponents: true });

    createInteractionCollector({
      customIds,
      interaction,
      message,
      onClick: async (action) => {
        const modalCustomId = this.client.uuid(action.user.id);
        const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Role Labels');
        const leaderInput = new TextInputBuilder()
          .setCustomId(customIds.leader)
          .setLabel('Leader')
          .setPlaceholder('Leader Role (Defaults to Lead)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(10)
          .setRequired(false);
        if (state.leader) leaderInput.setValue(state.leader);

        const coLeaderInput = new TextInputBuilder()
          .setCustomId(customIds.coLeader)
          .setLabel('Co-Leader')
          .setPlaceholder('Co-Leader Role (Defaults to Co-Lead)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(10)
          .setRequired(false);
        if (state.coLeader) coLeaderInput.setValue(state.coLeader);

        const elderInput = new TextInputBuilder()
          .setCustomId(customIds.admin)
          .setLabel('Elder')
          .setPlaceholder('Elder Role (Defaults to Eld)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(10)
          .setRequired(false);
        if (state.admin) elderInput.setValue(state.admin);

        const memberInput = new TextInputBuilder()
          .setCustomId(customIds.member)
          .setLabel('Member')
          .setPlaceholder('Member Role (Defaults to Mem)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(10)
          .setRequired(false);
        if (state.member) memberInput.setValue(state.member);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(leaderInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(coLeaderInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(elderInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(memberInput)
        );

        await action.showModal(modal);

        try {
          const modalSubmit = await action.awaitModalSubmit({
            time: 10 * 60 * 1000,
            filter: (action) => action.customId === modalCustomId
          });
          const leaderLabel = modalSubmit.fields.getTextInputValue(customIds.leader);
          const coLeaderLabel = modalSubmit.fields.getTextInputValue(customIds.coLeader);
          const adminLabel = modalSubmit.fields.getTextInputValue(customIds.admin);
          const memberLabel = modalSubmit.fields.getTextInputValue(customIds.member);

          state.leader = leaderLabel.trim();
          state.coLeader = coLeaderLabel.trim();
          state.admin = adminLabel.trim();
          state.member = memberLabel.trim();

          await modalSubmit.deferUpdate();

          mutateLabelsText();

          await this.client.settings.set(interaction.guild, Settings.ROLE_REPLACEMENT_LABELS, state);
          await modalSubmit.editReply({ withComponents: true, components: [container] });
        } catch (e) {
          if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
            throw e;
          }
        }
      }
    });
  }
}
