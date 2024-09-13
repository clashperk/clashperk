import { Collections } from '@app/constants';
import { CommandInteraction } from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';

export default class VerifyPlayerCommand extends Command {
  public constructor() {
    super('verify', {
      category: 'link',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      player_tag: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public async exec(interaction: CommandInteraction<'cached'>, { tag, token }: { tag: string; token: string }) {
    const data = await this.client.resolver.resolvePlayer(interaction, tag);
    if (!data) return;

    const { body } = await this.client.http.verifyPlayerToken(data.tag, token);
    if (body.status !== 'ok') {
      return interaction.editReply(this.i18n('command.verify.invalid_token', { lng: interaction.locale }));
    }

    const collection = this.client.db.collection(Collections.PLAYER_LINKS);
    await collection.deleteOne({ userId: { $ne: interaction.user.id }, tag: data.tag });
    const lastAccount = await collection.findOne({ userId: interaction.user.id }, { sort: { order: -1 } });
    await collection.updateOne(
      { tag: data.tag },
      {
        $set: {
          tag: data.tag,
          name: data.name,
          userId: interaction.user.id,
          username: interaction.user.username,
          displayName: interaction.user.displayName,
          discriminator: interaction.user.discriminator,
          verified: true,
          source: 'bot',
          linkedBy: interaction.user.id,
          updatedAt: new Date()
        },
        $setOnInsert: {
          order: lastAccount ? lastAccount.order + 1 : 0,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    this.resetLinkAPI(interaction.user.id, data.tag);
    this.client.rolesManager.updateOne(interaction.user, interaction.guildId, !lastAccount);

    return interaction.editReply(
      this.i18n('command.verify.success', { lng: interaction.locale, info: `${data.name} (${data.tag}) ${EMOJIS.VERIFIED}` })
    );
  }

  private async resetLinkAPI(userId: string, tag: string) {
    await this.client.http.unlinkPlayerTag(tag);
    await this.client.http.linkPlayerTag(userId, tag);
  }
}
