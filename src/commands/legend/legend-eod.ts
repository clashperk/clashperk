import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, User } from 'discord.js';
import { getEodAttacksEmbedMaker, getEodDay } from '../../helper/legend-eod.helper.js';
import { Command } from '../../lib/index.js';
import { Collections, LEGEND_LEAGUE_ID } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';
import { Season, Util } from '../../util/index.js';

export default class LegendEodFinishersCommand extends Command {
  public constructor() {
    super('legend-eod', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      clans?: string;
      user?: User;
      day?: number;
      location?: string;
    }
  ) {
    const seasonId = Season.ID;

    let clans: { tag: string; name: string }[] = [];
    let legendMembers: { name: string; tag: string; trophies: number }[] = [];
    let playerTags: string[] = [];

    if (args.location) {
      const loc = await this.client.db
        .collection(Collections.PLAYER_RANKS)
        .findOne({ countryCode: args.location || 'global', season: Season.ID });

      if (loc) {
        legendMembers = loc.players.map((player) => ({
          name: player.name,
          tag: player.tag,
          trophies: player.trophies
        }));
        playerTags = legendMembers.map((member) => member.tag);
      }
    } else {
      const resolved = await this.getClans(interaction, args);
      if (!resolved) return;

      legendMembers = resolved.clans
        .flatMap((clan) => clan.memberList)
        .filter((member) => member.trophies >= 5000 || member.league?.id === LEGEND_LEAGUE_ID);
      playerTags = legendMembers.map((member) => member.tag);
      clans = resolved.clans.map((clan) => ({ tag: clan.tag, name: clan.name }));
    }

    const { embed } = await getEodAttacksEmbedMaker({
      clans,
      guild: interaction.guild,
      leagueDay: args.day,
      legendMembers,
      playerTags,
      seasonId
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(JSON.stringify({ cmd: this.id, clans: clans.map((clan) => clan.tag).join(','), location: args.location }))
    );

    const isCurrentDay = Util.getLegendDay() === getEodDay().day;
    return interaction.editReply({ embeds: [embed], components: isCurrentDay ? [row] : [] });
  }

  private async getClans(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; tag?: string; user?: User; location?: string }
  ) {
    const isSingleTag = args.clans && this.client.http.isValidTag(this.client.http.fixTag(args.clans));

    if (args.clans && !isSingleTag) {
      const { resolvedArgs, clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
      if (!clans) return;

      const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
      if (_clans.length) return { clans: _clans, resolvedArgs };
    }

    const clan = await this.client.resolver.resolveClan(interaction, args?.clans ?? args.tag ?? args.user?.id);
    if (!clan) return;

    return { clans: [clan], resolvedArgs: null };
  }
}
