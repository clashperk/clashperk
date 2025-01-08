import { Settings } from '@app/constants';
import { Interaction, MessageComponentInteraction } from 'discord.js';
import { Listener } from '../../lib/handlers.js';
import ComponentHandler from '../../struct/component-handler.js';

export default class ComponentInteractionListener extends Listener {
  private readonly componentHandler: ComponentHandler;

  public constructor() {
    super('component-interaction', {
      emitter: 'client',
      category: 'client',
      event: 'interactionCreate'
    });
    this.componentHandler = new ComponentHandler(this.client);
  }

  public exec(interaction: Interaction) {
    if (interaction.isMessageComponent()) {
      return this.componentInteraction(interaction);
    }
  }

  private async componentInteraction(interaction: MessageComponentInteraction) {
    if (this.inhibitor(interaction)) return;

    const userIds = this.client.components.get(interaction.customId);
    if (userIds?.length && userIds.includes(interaction.user.id)) return;
    if (userIds?.length && !userIds.includes(interaction.user.id)) {
      this.client.logger.log(`[${interaction.guild!.name}/${interaction.user.displayName}]`, { label: 'COMPONENT_BLOCKED' });
      return interaction.reply({ content: this.i18n('common.component.unauthorized', { lng: interaction.locale }), ephemeral: true });
    }

    if (this.client.components.has(interaction.customId)) return;
    if (await this.componentHandler.exec(interaction)) return;

    this.client.logger.log(`[${interaction.guild!.name}/${interaction.user.displayName}] -> ${interaction.customId}`, {
      label: 'COMPONENT_EXPIRED'
    });

    const isEmpty = !(
      interaction.message.attachments.size ||
      interaction.message.embeds.length ||
      interaction.message.content.length ||
      interaction.message.stickers.size
    );

    const content = this.i18n('common.component.expired', { lng: interaction.locale });

    if (isEmpty) {
      return interaction.update({ components: [], content });
    }

    await interaction.update({ components: [] });
    return interaction.followUp({ content, ephemeral: true });
  }

  private inhibitor(interaction: MessageComponentInteraction) {
    // TODO: ADD MORE CHECKS

    // if (!interaction.inCachedGuild()) return true;
    // if (!interaction.channel) return true;

    const guilds = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
    if (interaction.guildId && guilds.includes(interaction.guildId)) return true;

    const users = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
    return users.includes(interaction.user.id);
  }
}
