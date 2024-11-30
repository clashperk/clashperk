import { Interaction } from 'discord.js';
import { Inhibitor } from '../lib/handlers.js';

export default class CustomBotLockerInhibitor extends Inhibitor {
  public constructor() {
    super('custom-bot-locker', {
      reason: 'custom-bot',
      priority: 5,
      disabled: true
    });
  }

  public exec(interaction: Interaction): boolean {
    if (!interaction.inCachedGuild()) return false;

    if (!this.client.isCustom()) return false;

    if (this.client.isOwner(interaction.guild.ownerId)) return false;

    return !this.client.patreonHandler.get(interaction.guildId);
  }
}
