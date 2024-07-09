import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, MessageType, User } from 'discord.js';
import { getClanSwitchingMenu } from '../../helper/clans.helper.js';
import { Command } from '../../lib/index.js';
import { lastSeenEmbedMaker } from '../../util/__helper.js';
import { Collections } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';

export default class LastSeenCommand extends Command {
  public constructor() {
    super('lastseen', {
      category: 'activity',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { tag?: string; score?: boolean; user?: User }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const allowed = await this.client.db.collection(Collections.CLAN_STORES).countDocuments({ guild: interaction.guild.id, tag: clan.tag });
    if (!allowed && interaction.guild.id !== '509784317598105619') {
      return interaction.editReply(
        this.i18n('common.guild_unauthorized', {
          lng: interaction.locale,
          clan: `${clan.name} (${clan.tag})`,
          command: this.client.commands.SETUP_ENABLE
        })
      );
    }

    const enough = await this.client.db.collection(Collections.PLAYERS).countDocuments({ 'clan.tag': clan.tag });
    if (!enough) {
      return interaction.editReply(this.i18n('common.no_clan_data', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` }));
    }

    const embed = await lastSeenEmbedMaker(clan, { color: this.client.embed(interaction), scoreView: args.score });
    if (interaction.isCommand() || (interaction.isMessageComponent() && interaction.message.type === MessageType.ChatInputCommand)) {
      embed.setFooter({ text: embed.data.footer!.text, iconURL: interaction.user.displayAvatarURL() });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(JSON.stringify({ cmd: this.id, _: 0, tag: clan.tag }))
          .setEmoji(EMOJIS.REFRESH)
      )
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, score: !args.score }))
          .setLabel(args.score ? 'Last Seen' : 'Scoreboard')
      );

    const clanRow = await getClanSwitchingMenu(
      interaction,
      this.createId({ cmd: this.id, score: args.score, string_key: 'tag' }),
      clan.tag
    );

    const components = clanRow ? [row, clanRow] : [row];
    return interaction.editReply({ embeds: [embed], components, content: null });
  }
}
