import { WAR_LEAGUE_MAP, WAR_LEAGUE_PROMOTION_MAP } from '@app/constants';
import { APIClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { rankingSort } from '../../helper/cwl.helper.js';
import { Command } from '../../lib/handlers.js';
import { ClanWarLeagueGroupAggregated } from '../../struct/clash-client.js';
import { CWL_LEAGUES, EMOJIS } from '../../util/emojis.js';
import { Season, Util } from '../../util/toolkit.js';

const suffixes = new Map([
  ['one', 'st'],
  ['two', 'nd'],
  ['few', 'rd'],
  ['other', 'th']
]);

export default class SummaryCWLRanks extends Command {
  public constructor() {
    super('summary-cwl-ranks', {
      category: 'none',
      clientPermissions: ['AttachFiles', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; season?: string }) {
    const season = args.season ?? Util.getCWLSeasonId();
    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.coc._getClans(clans);

    const chunks = [];
    for (const clan of _clans) {
      const [lastLeagueGroup, leagueGroup] = await Promise.all([
        this.client.coc.getClanWarLeagueGroup(clan.tag),
        this.client.storage.getWarTags(clan.tag, season)
      ]);
      if (!leagueGroup?.leagues?.[clan.tag] || leagueGroup.season !== season) continue;

      const isApiData = !(!lastLeagueGroup.res.ok || lastLeagueGroup.body.state === 'notInWar' || lastLeagueGroup.body.season !== season);

      const aggregated = await this.client.coc.aggregateClanWarLeague(clan.tag, leagueGroup, isApiData);
      if (!aggregated) continue;

      const ranking = await this.rounds({ body: aggregated, clan });
      if (!ranking) continue;

      chunks.push({
        warLeagueId: leagueGroup.leagues[clan.tag],
        ...ranking,
        status: lastLeagueGroup.body.state
      });
    }

    const leagueGroups = Object.entries(
      chunks.reduce<Record<string, { rank: number; name: string; tag: string; stars: number; status: string }[]>>((acc, cur) => {
        acc[cur.warLeagueId] ??= [];
        acc[cur.warLeagueId].push({ ...cur.clan, rank: cur.rank, stars: cur.clan.stars, status: cur.status });
        return acc;
      }, {})
    );

    const embed = new EmbedBuilder().setTimestamp().setColor(this.client.embed(interaction));
    embed.setDescription(`${EMOJIS.CWL} **Clan War League Ranking (${season})**`);
    leagueGroups.sort(([a], [b]) => Number(b) - Number(a));
    leagueGroups.forEach(([leagueId, clans], idx) => {
      clans.sort((a, b) => b.stars - a.stars);
      clans.sort((a, b) => a.rank - b.rank);

      const _clans = clans.map((clan) => {
        const emoji =
          clan.rank <= WAR_LEAGUE_PROMOTION_MAP[leagueId].promotion
            ? EMOJIS.UP_KEY
            : clan.rank >= WAR_LEAGUE_PROMOTION_MAP[leagueId].demotion
              ? EMOJIS.DOWN_KEY
              : EMOJIS.STAYED_SAME;
        const stars = clan.stars.toString().padStart(3, ' ');
        const name = escapeMarkdown(clan.name);
        const label = `${emoji} \`${this.formatRank(clan.rank)}\`${EMOJIS.MINI_STAR}\`${stars}\` \u2002${name}`;
        return `\u200e${label}`;
      });

      const emptySpace = idx === leagueGroups.length - 1 ? '' : '\n\u200b';
      const chunks = Util.splitMessage(`${_clans.join('\n')}${emptySpace}`, { maxLength: 1024 });
      chunks.forEach((chunk, i) => {
        embed.addFields({
          name: i === 0 ? `${CWL_LEAGUES[WAR_LEAGUE_MAP[leagueId]]} ${WAR_LEAGUE_MAP[leagueId]}` : '\u200b',
          value: chunk
        });
      });
    });

    if (!chunks.length) {
      return interaction.editReply(this.i18n('command.cwl.no_season_data', { lng: interaction.locale, season: season ?? Season.ID }));
    }

    const customId = this.createId({ cmd: this.id, clans: resolvedArgs, season: args.season });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setCustomId(customId).setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async rounds({ body, clan }: { body: ClanWarLeagueGroupAggregated; clan: APIClan }) {
    const ranking: {
      [key: string]: {
        name: string;
        tag: string;
        stars: number;
        attacks: number;
        destruction: number;
      };
    } = {};

    for (const data of body.wars) {
      ranking[data.clan.tag] ??= {
        name: data.clan.name,
        tag: data.clan.tag,
        stars: 0,
        destruction: 0,
        attacks: 0
      };
      const clan = ranking[data.clan.tag];

      clan.stars += data.clan.stars;
      if (data.state === 'warEnded' && this.client.coc.isWinner(data.clan, data.opponent)) {
        clan.stars += 10;
      }
      clan.attacks += data.clan.attacks;
      clan.destruction += data.clan.destructionPercentage * data.teamSize;

      ranking[data.opponent.tag] ??= {
        name: data.opponent.name,
        tag: data.opponent.tag,
        stars: 0,
        destruction: 0,
        attacks: 0
      };
      const opponent = ranking[data.opponent.tag];

      opponent.stars += data.opponent.stars;
      if (data.state === 'warEnded' && this.client.coc.isWinner(data.opponent, data.clan)) {
        opponent.stars += 10;
      }
      opponent.attacks += data.opponent.attacks;
      opponent.destruction += data.opponent.destructionPercentage * data.teamSize;
    }

    const _ranking = Object.values(ranking).sort(rankingSort);
    if (!_ranking.length) return null;
    const index = _ranking.findIndex((r) => r.tag === clan.tag);
    const rank = index + 1;
    return { rank, clan: _ranking[index] };
  }

  private formatRank(n: number) {
    const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });
    const rule = pr.select(n);
    const suffix = suffixes.get(rule);
    return `${n}${suffix!}`;
  }
}
