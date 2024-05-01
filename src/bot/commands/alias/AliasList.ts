import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

export default class AliasListCommand extends Command {
  public constructor() {
    super('alias-list', {
      category: 'setup',
      channel: 'guild',
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const clans = (await this.client.storage.find(interaction.guildId)).filter((clan) => clan.alias || clan.nickname);

    const chunks = Util.splitMessage(
      [
        `**${this.i18n('command.alias.list.title', { lng: interaction.locale })}**`,
        '',
        clans
          .map((clan) =>
            [
              `• **${clan.name} (${clan.tag as string})**`,
              `\u2002 **Alias:** ${clan.alias || 'None'}`,
              `\u2002 **Nick:** ${clan.nickname || 'None'}`
            ].join('\n')
          )
          .join('\n\n')
      ].join('\n')
    );

    for (const content of chunks) await interaction.followUp({ content, ephemeral: true });
  }
}
