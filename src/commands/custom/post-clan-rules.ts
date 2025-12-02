import { Collections } from '@app/constants';
import { ClanLogType } from '@app/entities';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { Command } from '../../lib/handlers.js';

export default class PostClanRulesCommand extends Command {
  public constructor() {
    super('post-clan-rules', {
      category: 'custom',
      channel: 'guild',
      defer: false,
      ephemeral: true
    });
  }

  public async exec(interaction: ButtonInteraction<'cached'>, args: { tag: string }) {
    const log = await this.client.db.collection(Collections.CLAN_LOGS).findOne({
      guildId: interaction.guildId,
      clanTag: args.tag,
      logType: ClanLogType.CLAN_EMBED_LOG
    });

    if (!log?.metadata.rulesText) {
      return interaction.reply({ content: 'No clan rules found.', flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({ content: log.metadata.rulesText, flags: MessageFlags.Ephemeral });
  }
}
