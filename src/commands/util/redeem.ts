import { Collections, Settings } from '@app/constants';
import { PatreonMembersEntity } from '@app/entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  WebhookMessageEditOptions
} from 'discord.js';
import { WithId } from 'mongodb';
import { Args, Command } from '../../lib/handlers.js';
import { PatreonUser, guildLimits } from '../../struct/patreon-handler.js';

const defaultClanLimit = 50;

export default class RedeemCommand extends Command {
  public constructor() {
    super('redeem', {
      category: 'setup',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      disable: {
        match: 'BOOLEAN'
      }
    };
  }

  public async exec(interaction: CommandInteraction<'cached'>, { disable }: { disable?: boolean }) {
    const data = await this.client.patreonHandler.fetchAPI();
    if (!data) {
      return interaction.editReply({
        content: '**Something went wrong (unresponsive api), please [contact us.](https://discord.gg/ppuppun)**'
      });
    }

    const disabledUserIds = this.client.settings.get<string[]>('global', Settings.DISABLED_PATREON_IDS, []);
    const patron = data.included.find(
      (entry) => !disabledUserIds.includes(entry.id) && entry.attributes.social_connections?.discord?.user_id === interaction.user.id
    );
    if (!patron) {
      const embed = new EmbedBuilder()
        .setColor(16345172)
        .setDescription(
          [
            'I could not find any Patreon account connected to your Discord.',
            '',
            'Make sure that you are connected and subscribed to ClashPerk.',
            'Not subscribed yet? [Subscribe on Patreon](https://www.patreon.com/clashperk)'
          ].join('\n')
        )
        .addFields([{ name: 'How to connect?', value: 'https://www.patreon.com/settings/apps' }])
        .setImage('https://i.imgur.com/APME0CX.png');

      return interaction.editReply({ embeds: [embed] });
    }

    const collection = this.client.db.collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS);
    const user = await collection.findOne({ id: patron.id });

    if (disable) {
      if (!user) return interaction.editReply('**You do not have an active subscription.**');
      if (!user.guilds.length) {
        return interaction.editReply('**You do not have an active subscription.**');
      }

      return this.disableRedemption(interaction, { select: true, user, message: { content: '**Manage Patreon Subscriptions**' } });
    }

    if (this.client.patreonHandler.get(interaction.guild.id)) {
      return interaction.editReply('**This server already has an active subscription.**');
    }

    const pledge = data.data.find((entry) => entry.relationships.user.data.id === patron.id);
    if (!pledge) {
      return interaction.editReply('**Something went wrong (unknown pledge), please [contact us.](https://discord.gg/ppuppun)**');
    }

    const isGifted = !!pledge.attributes.is_gifted || ['gifted', 'sponsored', 'lifetime'].includes(pledge.attributes.note);

    if (pledge.attributes.patron_status !== 'active_patron' && !isGifted) {
      return interaction.editReply('**Something went wrong (declined pledge), please [contact us.](https://discord.gg/ppuppun)**');
    }

    const rewardId = pledge.relationships.currently_entitled_tiers.data[0]?.id;
    if (!rewardId || !(rewardId in guildLimits)) {
      return interaction.editReply(
        `**Something went wrong (unknown tier ${rewardId || '00000'}), please [contact us.](https://discord.gg/ppuppun)**`
      );
    }

    const embed = new EmbedBuilder()
      .setColor(16345172)
      .setDescription([`Subscription enabled for **${interaction.guild.name}**`].join('\n'));

    if (!user) {
      await collection.updateOne(
        { id: patron.id },
        {
          $set: {
            id: patron.id,
            name: patron.attributes.full_name,
            rewardId,
            userId: interaction.user.id,
            username: interaction.user.username,
            guilds: [
              {
                id: interaction.guild.id,
                name: interaction.guild.name,
                limit: defaultClanLimit
              }
            ],
            redeemed: true,
            isGifted: !!pledge.attributes.is_gifted,
            isLifetime: ['gifted', 'sponsored', 'lifetime'].includes(pledge.attributes.note),
            active: true,
            declined: false,
            cancelled: false,
            entitledAmount: pledge.attributes.currently_entitled_amount_cents,
            lifetimeSupport: pledge.attributes.campaign_lifetime_support_cents,
            createdAt: new Date(pledge.attributes.pledge_relationship_start),
            lastChargeDate: new Date(pledge.attributes.last_charge_date)
          }
        },
        { upsert: true }
      );

      await this.client.patreonHandler.refresh();
      await this.sync(interaction.guild.id);
      return interaction.editReply({ embeds: [embed] });
    }

    const redeemed = this.redeemed({ ...user, rewardId });
    if (redeemed) {
      if (!this.isNew(user, interaction, patron)) await this.client.patreonHandler.refresh();
      const embed = new EmbedBuilder()
        .setColor(16345172)
        .setDescription(
          ["You've already claimed your subscription!", 'If you think it is wrong, please [contact us.](https://discord.gg/ppuppun)'].join(
            '\n'
          )
        );
      return this.disableRedemption(interaction, { select: false, user, message: { embeds: [embed] } });
    }

    // not redeemed
    await collection.updateOne(
      { id: patron.id },
      {
        $set: {
          userId: interaction.user.id,
          username: interaction.user.username,
          active: true,
          declined: false,
          cancelled: false,
          redeemed: true,
          isGifted: !!pledge.attributes.is_gifted,
          isLifetime: ['gifted', 'sponsored', 'lifetime'].includes(pledge.attributes.note),
          entitledAmount: pledge.attributes.currently_entitled_amount_cents,
          lifetimeSupport: pledge.attributes.campaign_lifetime_support_cents,
          lastChargeDate: new Date(pledge.attributes.last_charge_date)
        },
        $push: {
          guilds: {
            id: interaction.guild.id,
            name: interaction.guild.name,
            limit: defaultClanLimit
          }
        }
      }
    );

    await this.client.patreonHandler.refresh();
    await this.sync(interaction.guild.id);
    return interaction.editReply({ embeds: [embed] });
  }

  private async disableRedemption(
    interaction: CommandInteraction,
    { message, user, select }: { message: WebhookMessageEditOptions; user: WithId<PatreonMembersEntity>; select: boolean }
  ) {
    const collection = this.client.db.collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS);
    const customIds = {
      button: this.client.uuid(interaction.user.id),
      menu: this.client.uuid(interaction.user.id)
    };
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(customIds.button).setLabel('Manage Servers')
    );
    const menus = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder('Select one to disable subscription.')
        .setCustomId(customIds.menu)
        .addOptions(user.guilds.map((guild) => ({ label: guild.name, value: guild.id, description: guild.id })))
    );
    const msg = await interaction.editReply({ ...message, components: select ? [menus] : [row] });
    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 5 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.button) {
        await action.update({
          embeds: [],
          components: [menus],
          content: '**Select a server to disable subscription.**'
        });
      }

      if (action.customId === customIds.menu && action.isStringSelectMenu()) {
        const id = action.values.at(0)!.trim();
        const guild = user.guilds.find((guild) => guild.id === id);
        if (!guild) {
          await action.update({
            content: '**Something went wrong (unknown server), please [contact us.](https://discord.gg/ppuppun)**'
          });
          return;
        }
        await action.deferUpdate();
        await collection.updateOne({ _id: user._id }, { $pull: { guilds: { id } } });
        await this.client.patreonHandler.deleteGuild(id);
        await action.editReply({ components: [], content: `Subscription disabled for **${guild.name} (${guild.id})**` });
      }
    });
  }

  private isNew(user: PatreonMembersEntity, interaction: CommandInteraction, patron: PatreonUser) {
    if (user.userId !== interaction.user.id) {
      this.client.db.collection(Collections.PATREON_MEMBERS).updateOne(
        { id: patron.id },
        {
          $set: {
            userId: interaction.user.id,
            username: interaction.user.username
          }
        }
      );
      return true;
    }
    return false;
  }

  private async sync(guild: string) {
    const collection = this.client.db.collection(Collections.CLAN_STORES);
    await collection.updateMany({ guild }, { $set: { active: true, patron: true } });
    for await (const data of collection.find({ guild })) {
      this.client.enqueuer.add({ tag: data.tag, guild: data.guild });
    }
  }

  private redeemed(user: PatreonMembersEntity) {
    if (user.rewardId in guildLimits && user.guilds.length >= guildLimits[user.rewardId]) return true;
    return false;
  }
}
