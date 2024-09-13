import { Interaction } from 'discord.js';
import { Listener } from '../../lib/handlers.js';

export default class InteractionCaptureListener extends Listener {
  public constructor() {
    super('interactionCapture', {
      emitter: 'client',
      category: 'client',
      event: 'interactionCreate'
    });
  }

  public exec(interaction: Interaction) {
    if (!interaction.inCachedGuild() || interaction.isAutocomplete()) return;

    this.client.postHog.capture({
      distinctId: interaction.guildId,
      event: 'Interaction',
      sendFeatureFlags: false,
      disableGeoip: true,
      properties: {
        $set: {
          name: interaction.guild.name,
          id: interaction.guild.id,
          members: interaction.guild.approximateMemberCount || interaction.guild.memberCount,
          is_premium: this.client.patreonHandler.get(interaction.guildId),
          owner_id: interaction.guild.ownerId
        },
        $set_once: { invited_at: interaction.guild.joinedAt }
      }
    });
  }
}
