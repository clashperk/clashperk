import { Collections } from '@app/constants';
import { CommandInteraction, EmbedBuilder, escapeMarkdown } from 'discord.js';
import moment from 'moment';
import { cluster } from 'radash';
import { Command } from '../../lib/handlers.js';
import { dynamicPagination } from '../../util/pagination.js';
import { Season } from '../../util/toolkit.js';

export default class LeaderboardPlayersCommand extends Command {
  public constructor() {
    super('leaderboard-players', {
      category: 'search',
      channel: 'guild',
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { season: string; location: string }
  ) {
    const loc = await this.client.db
      .collection(Collections.PLAYER_RANKS)
      .findOne({ countryCode: args.location || 'global', season: args.season || Season.ID });

    if (!loc) {
      return interaction.editReply('An error occurred while fetching the leaderboard.');
    }

    const players = loc.players.map((player) => ({
      name: player.name,
      tag: player.tag,
      rank: player.rank,
      trophies: player.trophies
    }));

    const season = moment(loc.season).format('MMM YYYY');
    const embeds: EmbedBuilder[] = [];

    cluster(players, 100).forEach((players, idx) => {
      const embed = new EmbedBuilder();
      embed.setColor(this.client.embed(interaction));
      embed.setDescription(
        players
          .map(
            (player) =>
              `${idx * 101}. \`${player.trophies}\` \u200b \u200e${escapeMarkdown(player.name)}`
          )
          .join('\n')
      );
      embed.setTitle(`${loc.country} Player Leaderboard (${season})`);
      embed.setFooter({ text: `${loc.country} (${season})` });
      embeds.push(embed);
    });

    return dynamicPagination(interaction, embeds, { cmd: this.id, ...args });
  }
}
