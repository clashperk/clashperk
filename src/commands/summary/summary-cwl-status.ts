import { UNRANKED_WAR_LEAGUE_ID, WAR_LEAGUE_MAP } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { group, parallel } from 'radash';
import { Command } from '../../lib/handlers.js';
import { CWL_LEAGUES, EMOJIS } from '../../util/emojis.js';

enum SpinStatus {
  SPINNING = 1,
  MATCHED = 2,
  STANDBY = 3
}

export default class SummaryCWLStatus extends Command {
  public constructor() {
    super('summary-cwl-status', {
      category: 'none',
      clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
      defer: true
    });
  }

  private getCWLSeasonId() {
    return new Date().toISOString().slice(0, 7);
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; season?: string }
  ) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.coc._getClans(clans);

    const result = await parallel(50, _clans, async (clan) => {
      const { res, body } = await this.client.coc.getClanWarLeagueGroup(clan.tag);
      return { clan, res, body };
    });

    const chunks: Aggregated[] = [];
    for (const { clan, res, body } of result) {
      let status = SpinStatus.STANDBY;

      if (!res.ok && res.status === 500) {
        status = SpinStatus.SPINNING;
      } else if (body.state === 'notInWar') {
        status = SpinStatus.SPINNING;
      } else if (body.season === this.getCWLSeasonId()) {
        status = SpinStatus.MATCHED;
      }

      chunks.push({
        name: clan.name,
        tag: clan.tag,
        status,
        leagueId: clan.warLeague?.id ?? UNRANKED_WAR_LEAGUE_ID
      });
    }

    chunks.sort((a, b) => a.status - b.status);

    const grouped = group(chunks, (ch) => ch.leagueId.toString()) as Record<string, Aggregated[]>;
    const clanGroups = Object.entries(grouped).sort(([a], [b]) => +b - +a);

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`${interaction.guild.name} CWL Spin Status`)
      .setTimestamp();

    const statusMap = {
      [SpinStatus.STANDBY]: EMOJIS.STAYED_SAME,
      [SpinStatus.MATCHED]: EMOJIS.OK,
      [SpinStatus.SPINNING]: EMOJIS.LOADING
    };

    clanGroups.map(([leagueId, clans]) => {
      embed.addFields({
        name: `${CWL_LEAGUES[WAR_LEAGUE_MAP[leagueId]]} ${WAR_LEAGUE_MAP[leagueId]}`,
        value: clans.map((clan) => `${statusMap[clan.status]} \u200e${clan.name}`).join('\n')
      });
    });

    const customId = this.createId({ cmd: this.id });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(customId)
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }
}

interface Aggregated {
  name: string;
  tag: string;
  status: SpinStatus;
  leagueId: number;
}
