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
import { Args, Command } from '../../lib/index.js';
import { ClanEmbedFieldOptions, ClanEmbedFieldValues } from '../../util/CommandOptions.js';
import { Collections, Flags, missingPermissions, URL_REGEX } from '../../util/Constants.js';
import { clanEmbedMaker } from '../../util/Helper.js';
import { createInteractionCollector } from '../../util/Pagination.js';

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
    { tag, color, channel }: { tag: string; color?: number; channel: TextChannel | AnyThreadChannel }
  ) {
    const data = await this.client.resolver.enforceSecurity(interaction, { tag, collection: Collections.CLAN_EMBED_LOGS });
    if (!data) return;

    const permission = missingPermissions(channel, interaction.guild.members.me!, this.permissions);
    if (permission.missing) {
      return interaction.editReply(
        this.i18n('common.missing_access', {
          lng: interaction.locale,
					channel: channel.toString(), // eslint-disable-line
          permission: permission.missingPerms
        })
      );
    }

    const existing = await this.client.db.collection(Collections.CLAN_EMBED_LOGS).findOne({ tag: data.tag, guild: interaction.guild.id });

    const customIds = {
      customize: this.client.uuid(interaction.user.id),
      confirm: this.client.uuid(interaction.user.id),
      resend: this.client.uuid(interaction.user.id),
      fields: this.client.uuid(interaction.user.id)
    };

    const state: Partial<{ description: string; bannerImage: string; accepts: string; fields: ClanEmbedFieldValues[] }> = {
      description: existing?.embed?.description ?? 'auto',
      bannerImage: existing?.embed?.bannerImage ?? null,
      accepts: existing?.embed?.accepts ?? 'auto',
      fields: existing?.fields ?? ['*']
    };

    let embed = await clanEmbedMaker(data, { color, ...state });

    const customizeButton = new ButtonBuilder().setLabel('Customize').setStyle(ButtonStyle.Primary).setCustomId(customIds.customize);
    const confirmButton = new ButtonBuilder().setLabel('Confirm').setStyle(ButtonStyle.Success).setCustomId(customIds.confirm);

    const menu = new StringSelectMenuBuilder()
      .setOptions(ClanEmbedFieldOptions.map(({ label, value }) => ({ label, value, default: state.fields?.includes(value) })))
      .setCustomId(customIds.fields)
      .setMaxValues(ClanEmbedFieldOptions.length)
      .setPlaceholder(`Select the Fields`);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(customizeButton, confirmButton);
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(menu);

    if (existing) {
      const resendButton = new ButtonBuilder().setLabel('Resend').setStyle(ButtonStyle.Secondary).setCustomId(customIds.resend);
      const linkButton = new ButtonBuilder()
        .setLabel('Jump')
        .setURL(messageLink(existing.channel, existing.message, existing.guild))
        .setStyle(ButtonStyle.Link);
      buttonRow.addComponents(resendButton, linkButton);
    }

    const message = await interaction.editReply({ embeds: [embed], components: [buttonRow, menuRow] });

    const onFieldsCustomization = async (action: StringSelectMenuInteraction<'cached'>) => {
      await action.deferUpdate();

      state.fields = action.values as ClanEmbedFieldValues[];
      menu.setOptions(ClanEmbedFieldOptions.map(({ label, value }) => ({ label, value, default: state.fields?.includes(value) })));
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
        bannerImage: this.client.uuid(action.user.id)
      };

      const modal = new ModalBuilder().setCustomId(modalCustomIds.modal).setTitle(`${data.name} | Clan Embed`);
      const descriptionInput = new TextInputBuilder()
        .setCustomId(modalCustomIds.description)
        .setLabel('Description')
        .setPlaceholder('Enter a custom description. \nOr type "auto" to use the in-game clan description.')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1200)
        .setRequired(false);
      if (state.description) descriptionInput.setValue(state.description);

      const requirementsInput = new TextInputBuilder()
        .setCustomId(modalCustomIds.requirements)
        .setLabel('Requirements Text (Deprecated)')
        .setPlaceholder('Enter a custom requirement text. \nOr type "auto" to use the in-game settings.')
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

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(requirementsInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(bannerImageInput)
      );

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

        await modalSubmit.deferUpdate();

        embed = await clanEmbedMaker(data, {
          color,
          isDryRun: true,
          ...state
        });

        await modalSubmit.editReply({ embeds: [embed], components: [buttonRow, menuRow] });
      } catch (error) {
        if (!(error instanceof DiscordjsError && error.code === DiscordjsErrorCodes.InteractionCollectorError)) {
          throw error;
        }
      }
    };

    const mutate = async (message: string, channel: string, webhook: { id: string; token: string }) => {
      const id = await this.client.storage.register(interaction, {
        op: Flags.CLAN_EMBED_LOG,
        guild: interaction.guild.id,
        channel,
        tag: data.tag,
        color,
        name: data.name,
        message,
        embed: {
          accepts: state.accepts,
          bannerImage: state.bannerImage,
          description: state.description?.trim(),
          fields: state.fields
        },
        webhook: { id: webhook.id, token: webhook.token }
      });

      this.client.rpcHandler.add(id, {
        op: Flags.CLAN_EMBED_LOG,
        guild: interaction.guild.id,
        tag: data.tag
      });
    };

    const webhook = await this.client.storage.getWebhook(channel.isThread() ? channel.parent! : channel);
    if (!webhook) {
      return interaction.editReply(
        // eslint-disable-next-line
				this.i18n('command.setup.enable.too_many_webhooks', { lng: interaction.locale, channel: channel.toString() })
      );
    }

    const onResend = async (action: ButtonInteraction<'cached'>) => {
      const msg = await webhook.send(channel.isThread() ? { embeds: [embed], threadId: channel.id } : { embeds: [embed] });
      await mutate(msg.id, msg.channel.id, { id: webhook.id, token: webhook.token! });
      return action.update({ content: '**Clan embed created!**', embeds: [], components: [] });
    };

    const onConfirm = async (action: ButtonInteraction<'cached'>) => {
      try {
        if (!existing) throw new Error('No existing embed found', { cause: '6969' });

        const channel = interaction.guild.channels.cache.get(existing.channel);
        const webhook = new WebhookClient(existing.webhook);
        const msg = await webhook.editMessage(
          existing.message,
          channel?.isThread() ? { embeds: [embed], threadId: channel.id } : { embeds: [embed] }
        );

        await mutate(existing.message, msg.channel_id, existing.webhook);
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
