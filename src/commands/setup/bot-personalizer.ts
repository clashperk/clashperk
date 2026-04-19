import { getInviteLink } from '@app/constants';
import { PatreonMembersEntity } from '@app/entities';
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  ContainerBuilder,
  DiscordjsError,
  DiscordjsErrorCodes,
  FileUploadBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import moment from 'moment';
import { WithId } from 'mongodb';
import { Command } from '../../lib/handlers.js';
import { CustomScopes, CustomTiers, rewards } from '../../struct/subscribers.js';
import { EMOJIS } from '../../util/emojis.js';
import { createInteractionCollector } from '../../util/pagination.js';

export default class SetupCustomBotCommand extends Command {
  public constructor() {
    super('bot-personalizer', {
      category: 'setup',
      clientPermissions: ['EmbedLinks', 'AttachFiles', 'ChangeNickname'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { opt_out?: boolean }) {
    const customIds = {
      token: this.client.uuid(interaction.user.id),
      customize: this.client.uuid(interaction.user.id)
    };

    const patron = await this.client.subscribers.findOne(interaction.user.id);

    if (patron && patron.applicationId && args.opt_out) {
      await this.client.customBotManager.deleteService(patron.applicationId);
      return interaction.editReply(`Successfully deleted the personalized bot!`);
    }

    if (patron && patron.customBots?.[interaction.guildId] && args.opt_out) {
      await this.client.subscribers.unsetBotProfile(interaction.guild, patron);
      return interaction.editReply(`Successfully removed the bot personalization!`);
    }

    if (patron?.applicationId && !this.client.isOwner(interaction.user.id)) {
      return interaction.editReply(
        [
          `${EMOJIS.WRONG} You have already deployed a custom bot!`,
          `\nContact us on [Support Server](<https://discord.gg/ppuppun>) for assistance.`
        ].join('\n')
      );
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '### Build your own Discord bot!',
            '',
            'Personalize this bot to match your server. Choose a quick setup to update the avatar and nickname instantly, or deploy a fully branded bot with your own token.',
            '',
            '[How to setup your personalized bot?](<https://docs.clashperk.com/features/bot-personalizer>)'
          ].join('\n')
        )
      )
      .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "### Quick Customize \nChange ClashPerk's **avatar** and **nickname** in this server. No token required."
        )
      )
      .addActionRowComponents((r) =>
        r.addComponents(
          new ButtonBuilder()
            .setCustomId(customIds.customize)
            .setLabel('Quick Customize')
            .setStyle(ButtonStyle.Secondary)
        )
      )
      .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '### Full Custom Bot Setup \nDeploy your own fully branded bot using a custom token from the Discord Developer Portal.'
        )
      )
      .addActionRowComponents((r) =>
        r.addComponents(
          new ButtonBuilder()
            .setCustomId(customIds.token)
            .setLabel("Let's start!")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setURL('https://discord.com/developers/applications')
            .setLabel('Developer Portal')
            .setStyle(ButtonStyle.Link)
        )
      );

    const message = await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const fallbackMessage = (action: ButtonInteraction<'cached'>) => {
      return action.reply({
        flags: MessageFlags.Ephemeral,
        content:
          'You need an active [Gold tier Patreon subscription](<https://www.patreon.com/clashperk>) or a [Lifetime subscription](<https://www.paypal.com/ncp/payment/9MUE99PA4JYN2>) to use this feature.'
      });
    };

    const handleTokenSetup = async (action: ButtonInteraction<'cached'>) => {
      const isEligible =
        patron && this.isEligible(patron) && this.isAllowedGuild(patron, action.guildId);
      if (!isEligible) return fallbackMessage(action);

      const modalCustomId = this.client.uuid(action.user.id);

      const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Bot Personalizer');
      const tokenInput = new TextInputBuilder()
        .setCustomId(customIds.token)
        .setPlaceholder('Enter Bot Token')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true);
      modal.addLabelComponents(
        new LabelBuilder().setLabel('BOT TOKEN').setTextInputComponent(tokenInput)
      );

      await action.showModal(modal);

      try {
        const modalSubmit = await action.awaitModalSubmit({
          time: 10 * 60 * 1000,
          filter: (a) => a.customId === modalCustomId
        });
        const now = Date.now();
        await modalSubmit.deferUpdate();

        if (!patron) {
          return await modalSubmit.editReply(
            this.reply('You must be a Patreon member to deploy your own bot!')
          );
        }

        const botToken = modalSubmit.fields.getTextInputValue(customIds.token);
        const app = await this.client.customBotManager.getApplication(botToken);

        if (!app?.id) {
          return await modalSubmit.editReply(
            this.reply(
              'Failed to retrieve information of the application! The token might be invalid.'
            )
          );
        }

        if (!this.client.customBotManager.hasIntents(app)) {
          return await modalSubmit.editReply(
            this.reply('The bot does not have the all the intents enabled.')
          );
        }

        if (this.client.customBotManager.isPublic(app)) {
          return await modalSubmit.editReply(
            this.reply('The bot is public! You must keep the bot private.')
          );
        }

        const timeTaken = () =>
          moment.duration(Date.now() - now).format('h[h], m[m], s[s]', { trim: 'both mid' });

        const messages: string[] = [];
        messages.push(
          `${EMOJIS.OK} Setting up **[${app.name} (${app.id})](${getInviteLink(app.id)})**`
        );
        await modalSubmit.editReply(
          this.reply([...messages, `${EMOJIS.OK} Creating application commands...`].join('\n'))
        );

        const commands = await this.client.customBotManager.createCommands(
          app.id,
          interaction.guildId,
          botToken
        );
        if (!commands.length) {
          const member = await interaction.guild.members.fetch(app.id).catch(() => null);
          messages.push(`${EMOJIS.WRONG} Failed to create application commands...`);
          if (!member)
            messages.push(
              `\n[Click here to invite the bot](${getInviteLink(app.id)}) and try again.`
            );

          messages.push(
            `\nContact us on [Support Server](<https://discord.gg/ppuppun>) for assistance.`
          );
          return await modalSubmit.editReply(this.reply(messages.join('\n')));
        }

        messages.push(
          `${EMOJIS.OK} Created ${commands.length} application commands. [took ${timeTaken()}]`
        );
        await modalSubmit.editReply(
          this.reply([...messages, `${EMOJIS.LOADING} Deploying application...`].join('\n'))
        );

        const service = await this.client.customBotManager.createService({
          application: app,
          guildId: interaction.guildId,
          patronId: patron.id,
          token: botToken,
          user: interaction.user
        });
        await this.client.subscribers.attachCustomBot(patron.id, app.id);

        if (!service) {
          messages.push(`${EMOJIS.WRONG} Failed to deploy application...`);
          messages.push(
            `\nContact us on [Support Server](<https://discord.gg/ppuppun>) for assistance.`
          );
          return await modalSubmit.editReply(this.reply(messages.join('\n')));
        }

        messages.push(`${EMOJIS.OK} Successfully deployed application! [took ${timeTaken()}]`);
        messages.push(`Last step is to invite the bot into our custom emoji servers.`);
        messages.push(
          `Join [Support Server](<https://discord.gg/ppuppun>) and check <#1130139203213197434> for the list of the emoji servers.`
        );
        return modalSubmit.editReply(this.reply(messages.join('\n')));
      } catch (e) {
        if (
          !(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)
        ) {
          throw e;
        }
      }
    };

    const handleCustomize = async (action: ButtonInteraction<'cached'>) => {
      const isEligible =
        patron && this.isEligible(patron) && this.isAllowedGuild(patron, action.guildId);
      if (!isEligible) return fallbackMessage(action);

      const modalCustomId = this.client.uuid(action.user.id);
      const fieldIds = { avatar: 'avatar', nickname: 'nickname' };

      const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Quick Customize');

      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel('Avatar')
          .setFileUploadComponent(
            new FileUploadBuilder().setCustomId(fieldIds.avatar).setRequired(true)
          )
      );
      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel('Nickname')
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(fieldIds.nickname)
              .setPlaceholder('Enter a nickname for this server')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(32)
              .setRequired(true)
          )
      );

      await action.showModal(modal);

      try {
        const modalSubmit = await action.awaitModalSubmit({
          time: 10 * 60 * 1000,
          filter: (a) => a.customId === modalCustomId
        });
        await modalSubmit.deferUpdate();

        const avatarFile = modalSubmit.fields.getUploadedFiles(fieldIds.avatar, true).first()!;
        const nickname = modalSubmit.fields.getTextInputValue(fieldIds.nickname).trim();

        const editData = { nick: nickname, avatar: avatarFile.url };
        const updated = await this.client.subscribers.setBotProfile(
          interaction.guild,
          patron,
          editData
        );

        if (updated) {
          this.client.subscribers.updateGuildWebhooks(
            interaction.guild,
            interaction.applicationId,
            editData
          );

          return modalSubmit.editReply(
            this.reply(`${EMOJIS.OK} Bot appearance updated successfully!`)
          );
        } else {
          return modalSubmit.editReply(
            this.reply(
              `${EMOJIS.WRONG} Failed to apply changes — make sure the bot has permission to manage itself in this server or you are changing your avatar too fast.`
            )
          );
        }
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

    createInteractionCollector({
      interaction,
      customIds,
      message,
      onClick: (action) => {
        if (action.customId === customIds.token) return handleTokenSetup(action);
        if (action.customId === customIds.customize) return handleCustomize(action);
      }
    });
  }

  private isEligible(patron: WithId<PatreonMembersEntity>) {
    if (patron.rewardId === rewards.gold || patron.rewardId === rewards.gold_deprecated) {
      return true;
    }

    return [
      CustomTiers.LIFETIME_CUSTOM_BOT,
      CustomTiers.SPONSORED_CUSTOM_BOT,
      CustomScopes.CUSTOM_BOT
    ].includes(patron.note);
  }

  private isAllowedGuild(patron: PatreonMembersEntity, guildId: string) {
    return patron.guilds.some((guild) => guild.id === guildId);
  }
}
