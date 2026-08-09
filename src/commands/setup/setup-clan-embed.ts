import {
  Collections,
  DEEP_LINK_TYPES,
  FeatureFlags,
  Flags,
  missingPermissions,
  URL_REGEX
} from '@app/constants';
import { ClanLogType } from '@app/entities';
import {
  ActionRowBuilder,
  AnyThreadChannel,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  DiscordjsError,
  DiscordjsErrorCodes,
  Interaction,
  messageLink,
  ModalBuilder,
  PermissionsString,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  WebhookClient
} from 'discord.js';
import { ObjectId } from 'mongodb';
import { clanEmbedMaker } from '../../helper/clan-embed.helper.js';
import { Args, Command } from '../../lib/handlers.js';
import { ClanEmbedFieldOptions, ClanEmbedFieldValues } from '../../util/command.options.js';
import { createInteractionCollector } from '../../util/pagination.js';

export default class ClanEmbedCommand extends Command {
  public constructor() {
    super('setup-clan-embed', {
      category: 'none',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true,
      ephemeral: true
    });
  }

  public args(interaction: Interaction<'cached'>): Args {
    return {
      color: {
        match: 'COLOR',
        default: this.client.embed(interaction)
      },
      channel: {
        match: 'CHANNEL',
        default: interaction.channel!
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      clan: string;
      color?: number;
      channel: TextChannel | AnyThreadChannel;
      disable_embed?: boolean;
    }
  ) {
    if (args.disable_embed) {
      const _logs = await this.client.db
        .collection(Collections.CLAN_LOGS)
        .find({
          logType: ClanLogType.CLAN_EMBED_LOG,
          clanTag: args.clan,
          guildId: interaction.guildId
        })
        .toArray();

      const logIds = _logs.map((log) => log._id);
      logIds.forEach((logId) => this.client.enqueuer.deleteLog(logId.toHexString()));
      await this.client.db.collection(Collections.CLAN_LOGS).deleteMany({ _id: { $in: logIds } });

      return interaction.editReply('Clan embed disabled.');
    }

    const { clan, color, channel } = args;
    const data = await this.client.resolver.enforceSecurity(interaction, {
      tag: clan,
      collection: Collections.CLAN_LOGS
    });
    if (!data) return;

    const permission = missingPermissions(channel, interaction.guild.members.me!, this.permissions);
    if (permission.missing) {
      return interaction.editReply(
        this.i18n('common.missing_access', {
          lng: interaction.locale,
          channel: channel.toString(),
          permission: permission.missingPerms
        })
      );
    }

    const existing = await this.client.db.collection(Collections.CLAN_LOGS).findOne({
      clanTag: data.tag,
      guildId: interaction.guild.id,
      logType: ClanLogType.CLAN_EMBED_LOG
    });

    const customIds = {
      customize: this.client.uuid(interaction.user.id),
      confirm: this.client.uuid(interaction.user.id),
      resend: this.client.uuid(interaction.user.id),
      fields: this.client.uuid(interaction.user.id)
    };

    const state: Partial<{
      description: string;
      bannerImage: string;
      accepts: string;
      rulesText: string;
      fields: ClanEmbedFieldValues[];
    }> = {
      description: existing?.metadata?.description ?? 'auto',
      bannerImage: existing?.metadata?.bannerImage ?? null,
      accepts: existing?.metadata?.accepts ?? 'auto',
      rulesText: existing?.metadata?.rulesText ?? null,
      fields: existing?.metadata?.fields ?? ['*']
    };

    let embed = await clanEmbedMaker(data, { color, ...state });

    const customizeButton = new ButtonBuilder()
      .setLabel('Customize')
      .setStyle(ButtonStyle.Primary)
      .setCustomId(customIds.customize);
    const confirmButton = new ButtonBuilder()
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success)
      .setCustomId(customIds.confirm);

    const menu = new StringSelectMenuBuilder()
      .setOptions(
        ClanEmbedFieldOptions.map(({ label, value }) => ({
          label,
          value,
          default: state.fields?.includes(value)
        }))
      )
      .setCustomId(customIds.fields)
      .setMaxValues(ClanEmbedFieldOptions.length)
      .setPlaceholder(`Select the Fields`);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      customizeButton,
      confirmButton
    );
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(menu);

    if (existing) {
      const resendButton = new ButtonBuilder()
        .setLabel('Resend')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(customIds.resend);
      const linkButton = new ButtonBuilder().setLabel('Jump').setStyle(ButtonStyle.Link);
      if (existing.messageId) {
        linkButton.setURL(messageLink(existing.channelId, existing.messageId, existing.guildId));
      }
      buttonRow.addComponents(resendButton, linkButton);
    }

    const message = await interaction.editReply({
      embeds: [embed],
      components: [buttonRow, menuRow]
    });

    const onFieldsCustomization = async (action: StringSelectMenuInteraction<'cached'>) => {
      await action.deferUpdate();

      state.fields = action.values as ClanEmbedFieldValues[];
      menu.setOptions(
        ClanEmbedFieldOptions.map(({ label, value }) => ({
          label,
          value,
          default: state.fields?.includes(value)
        }))
      );
      menuRow.setComponents(menu);

      embed = await clanEmbedMaker(data, {
        color,
        isDryRun: true,
        ...state
      });

      return action.editReply({ embeds: [embed], components: [buttonRow, menuRow] });
    };

    const onCustomization = async (action: ButtonInteraction<'cached'>) => {
      const modalCustomIds = {
        modal: this.client.uuid(action.user.id),
        description: this.client.uuid(action.user.id),
        requirements: this.client.uuid(action.user.id),
        rules: this.client.uuid(action.user.id),
        bannerImage: this.client.uuid(action.user.id)
      };

      const modal = new ModalBuilder()
        .setCustomId(modalCustomIds.modal)
        .setTitle(`${data.name} | Clan Embed`);
      const descriptionInput = new TextInputBuilder()
        .setCustomId(modalCustomIds.description)
        .setLabel('Description')
        .setPlaceholder(
          'Enter a custom description. \nOr type "auto" to use the in-game clan description.'
        )
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1200)
        .setRequired(false);
      if (state.description) descriptionInput.setValue(state.description);

      const requirementsInput = new TextInputBuilder()
        .setCustomId(modalCustomIds.requirements)
        .setLabel('Requirements Text (Deprecated)')
        .setPlaceholder(
          'Enter a custom requirement text. \nOr type "auto" to use the in-game settings.'
        )
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(600)
        .setRequired(false);
      if (state.accepts) {
        requirementsInput.setValue(state.accepts).setMaxLength(Math.max(600, state.accepts.length));
      }

      const bannerImageInput = new TextInputBuilder()
        .setCustomId(modalCustomIds.bannerImage)
        .setLabel('Banner Image URL')
        .setPlaceholder('Enter an image URL')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(256)
        .setRequired(false);
      if (state.bannerImage) bannerImageInput.setValue(state.bannerImage);

      const rulesInput = new TextInputBuilder()
        .setCustomId(modalCustomIds.rules)
        .setLabel('Clan Rules')
        .setPlaceholder(
          'Type in your clan\'s rules here. They\'ll pop up when you click the "Clan Rules" button!'
        )
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(false);
      if (state.rulesText) {
        rulesInput.setValue(state.rulesText).setMaxLength(Math.max(2000, state.rulesText.length));
      }

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(requirementsInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(bannerImageInput)
      );

      const isRulesTextEnabled = this.client.isFeatureEnabled(
        FeatureFlags.CLAN_RULES_BUTTON,
        interaction.guild.id
      );
      if (isRulesTextEnabled) {
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(rulesInput));
      }

      await action.showModal(modal);

      try {
        const modalSubmit = await action.awaitModalSubmit({
          time: 10 * 60 * 1000,
          filter: (action) => action.customId === modalCustomIds.modal
        });

        const description = modalSubmit.fields.getTextInputValue(modalCustomIds.description);
        state.description = description.toLowerCase() === 'auto' ? 'auto' : description.trim();

        const requirements = modalSubmit.fields.getTextInputValue(modalCustomIds.requirements);
        state.accepts = requirements.toLowerCase() === 'auto' ? 'auto' : requirements.trim();

        const bannerImage = modalSubmit.fields.getTextInputValue(modalCustomIds.bannerImage);
        state.bannerImage = URL_REGEX.test(bannerImage) ? bannerImage : '';

        if (isRulesTextEnabled) {
          const rulesText = modalSubmit.fields.getTextInputValue(modalCustomIds.rules);
          state.rulesText = rulesText.trim();
        }

        await modalSubmit.deferUpdate();

        embed = await clanEmbedMaker(data, {
          color,
          isDryRun: true,
          ...state
        });

        await modalSubmit.editReply({ embeds: [embed], components: [buttonRow, menuRow] });
      } catch (error) {
        if (
          !(
            error instanceof DiscordjsError &&
            error.code === DiscordjsErrorCodes.InteractionCollectorError
          )
        ) {
          throw error;
        }
      }
    };

    const mutate = async (
      messageId: string,
      channelId: string,
      webhook: { id: string; token: string }
    ) => {
      const id = await this.client.storage.register(interaction, {
        op: Flags.CLAN_EMBED_LOG,
        guild: interaction.guild.id,
        channel,
        tag: data.tag,
        color,
        name: data.name
      });

      await this.client.db.collection(Collections.CLAN_LOGS).updateOne(
        {
          clanTag: data.tag,
          guildId: interaction.guildId,
          logType: ClanLogType.CLAN_EMBED_LOG
        },
        {
          $set: {
            isEnabled: true,
            deepLink: DEEP_LINK_TYPES.OPEN_IN_GAME,
            channelId,
            clanId: new ObjectId(id),
            color,
            metadata: {
              accepts: state.accepts,
              bannerImage: state.bannerImage,
              description: state.description?.trim(),
              fields: state.fields,
              rulesText: state.rulesText?.trim()
            },
            messageId,
            webhook: { id: webhook.id, token: webhook.token },
            updatedAt: new Date(),
            lastPostedAt: new Date(Date.now() - 30 * 60 * 1000)
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      this.client.enqueuer.add({
        guild: interaction.guild.id,
        tag: data.tag
      });
    };

    const webhook = await this.client.storage.getWebhook(
      channel.isThread() ? channel.parent! : channel
    );
    if (!webhook) {
      return interaction.editReply(
        this.i18n('common.too_many_webhooks', {
          lng: interaction.locale,
          channel: channel.toString()
        })
      );
    }

    const getEmbedButtons = () => {
      const isRulesTextEnabled = this.client.isFeatureEnabled(
        FeatureFlags.CLAN_RULES_BUTTON,
        interaction.guild.id
      );
      if (!isRulesTextEnabled) return [];

      const rulesButton = new ButtonBuilder()
        .setLabel('Clan Rules')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(this.createId({ cmd: 'post-clan-rules', tag: data.tag, defer: false }));
      return [new ActionRowBuilder<ButtonBuilder>().addComponents(rulesButton)];
    };

    const onResend = async (action: ButtonInteraction<'cached'>) => {
      const msg = await webhook.send(
        channel.isThread()
          ? { embeds: [embed], threadId: channel.id, components: getEmbedButtons() }
          : { embeds: [embed], components: getEmbedButtons() }
      );
      await mutate(msg.id, msg.channel.id, { id: webhook.id, token: webhook.token! });
      return action.update({ content: '**Clan embed created!**', embeds: [], components: [] });
    };

    const onConfirm = async (action: ButtonInteraction<'cached'>) => {
      try {
        if (!existing?.messageId) throw new Error('No existing embed found', { cause: '6969' });

        const channel = interaction.guild.channels.cache.get(existing.channelId);
        const webhook = new WebhookClient(existing.webhook!);
        const msg = await webhook.editMessage(
          existing.messageId,
          channel?.isThread()
            ? { embeds: [embed], threadId: channel.id, components: getEmbedButtons() }
            : { embeds: [embed], components: getEmbedButtons() }
        );

        await mutate(existing.messageId, msg.channel_id, existing.webhook!);
        return await action.update({
          embeds: [],
          components: [],
          content: `**Clan embed updated!** [Jump ↗️](${messageLink(msg.channel_id, msg.id, interaction.guildId)})`
        });
      } catch {
        return onResend(action);
      }
    };

    createInteractionCollector({
      interaction,
      message,
      customIds,
      onClick(action) {
        if (action.customId === customIds.customize) {
          return onCustomization(action);
        }
        if (action.customId === customIds.confirm) {
          return onConfirm(action);
        }
        if (action.customId === customIds.resend) {
          return onResend(action);
        }
      },
      onSelect(action) {
        if (action.customId === customIds.fields) {
          return onFieldsCustomization(action);
        }
      }
    });
  }

  private readonly permissions: PermissionsString[] = [
    'EmbedLinks',
    'UseExternalEmojis',
    'SendMessages',
    'ReadMessageHistory',
    'ManageWebhooks',
    'ViewChannel'
  ];
}
