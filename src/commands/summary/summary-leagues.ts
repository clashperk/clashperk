import {
  CAPITAL_LEAGUE_MAP,
  Collections,
  UNRANKED_CAPITAL_LEAGUE_ID,
  UNRANKED_WAR_LEAGUE_ID,
  WAR_LEAGUE_MAP
} from '@app/constants';
import { CapitalRaidSeasonsEntity } from '@app/entities';
import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  Guild
} from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { CAPITAL_LEAGUES, CWL_LEAGUES, EMOJIS } from '../../util/emojis.js';
import { Util } from '../../util/toolkit.js';

export default class SummaryLeaguesCommand extends Command {
  public constructor() {
    super('summary-leagues', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; is_capital?: boolean }
  ) {
    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, {
      args: args.clans
    });
    if (!clans) return;

    const _clans = await this.client.coc._getClans(clans);
    const embed = args.is_capital
      ? await this.getCapitalLeagueGroups(interaction.guild, _clans)
      : this.getWarLeagueGroups(interaction.guild, _clans);

    const payload = {
      cmd: this.id,
      clans: resolvedArgs,
      is_capital: args.is_capital
    };
    const customIds = {
      refresh: this.createId(payload),
      toggle: this.createId({ ...payload, is_capital: !args.is_capital })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(args.is_capital ? 'Clan War Leagues' : 'Capital Leagues')
        .setEmoji(args.is_capital ? EMOJIS.CWL : EMOJIS.CAPITAL_TROPHY)
        .setStyle(ButtonStyle.Primary)
        .setCustomId(customIds.toggle)
    );
    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private getWarLeagueId(clan: APIClan) {
    return clan.warLeague?.id ?? UNRANKED_WAR_LEAGUE_ID;
  }

  private getCapitalLeagueId(clan: APIClan) {
    return clan.capitalLeague?.id ?? UNRANKED_CAPITAL_LEAGUE_ID;
  }

  private getWarLeagueGroups(guild: Guild, clans: APIClan[]) {
    const leagueGroup = Object.entries(
      clans.reduce<Record<string, APIClan[]>>((acc, clan) => {
        const league = this.getWarLeagueId(clan);
        acc[league] ??= [];
        acc[league].push(clan);
        return acc;
      }, {})
    );

    const embed = new EmbedBuilder();
    embed
      .setColor(this.client.embed(guild.id))
      .setDescription(`${EMOJIS.CWL} **Clan War League Groups**`);
    leagueGroup
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([leagueId, clans], i) => {
        const emptySpace = this.extraSpace(leagueGroup.length, i);
        embed.addFields({
          name: `${CWL_LEAGUES[WAR_LEAGUE_MAP[leagueId]]} ${WAR_LEAGUE_MAP[leagueId]}`,
          value: `${clans.map((clan) => `\u200e${Util.escapeBackTick(clan.name)} (${clan.tag})`).join('\n')}${emptySpace}`
        });
      });

    return embed;
  }

  private getLastWeekId() {
    const { isRaidWeek, weekDate, weekId } = this.raidWeek();
    if (isRaidWeek) {
      weekDate.setUTCDate(weekDate.getUTCDate() - 7);
      return weekDate.toISOString().slice(0, 10);
    }
    return weekId;
  }

  private raidWeek() {
    const today = new Date();
    const weekDay = today.getUTCDay();
    const hours = today.getUTCHours();
    const isRaidWeek =
      (weekDay === 5 && hours >= 7) || [0, 6].includes(weekDay) || (weekDay === 1 && hours < 7);
    today.setUTCDate(today.getUTCDate() - today.getUTCDay());
    if (weekDay < 5 || (weekDay <= 5 && hours < 7)) today.setDate(today.getUTCDate() - 7);
    today.setUTCDate(today.getUTCDate() + 5);
    today.setUTCMinutes(0, 0, 0);
    return { weekDate: today, weekId: today.toISOString().slice(0, 10), isRaidWeek };
  }

  private async getCapitalLeagueGroups(guild: Guild, clans: APIClan[]) {
    const leagueGroup = Object.entries(
      clans.reduce<Record<string, APIClan[]>>((acc, clan) => {
        const league = this.getCapitalLeagueId(clan);
        acc[league] ??= [];
        acc[league].push(clan);
        return acc;
      }, {})
    );

    const leagues = await this.client.db
      .collection<Required<CapitalRaidSeasonsEntity>>(Collections.CAPITAL_RAID_SEASONS)
      .find({ tag: { $in: clans.map((clan) => clan.tag) }, weekId: this.getLastWeekId() })
      .toArray();

    const leaguesMap = leagues.reduce<Record<string, { gained: number; emoji: string }>>(
      (acc, league) => {
        if (league._clanCapitalPoints && league.clanCapitalPoints) {
          const emoji =
            league._capitalLeague.id > league.capitalLeague.id
              ? EMOJIS.UP_KEY
              : league._capitalLeague.id === league.capitalLeague.id
                ? EMOJIS.STAYED_SAME
                : EMOJIS.DOWN_KEY;
          acc[league.tag] = { gained: league._clanCapitalPoints - league.clanCapitalPoints, emoji };
        }
        return acc;
      },
      {}
    );

    const embed = new EmbedBuilder();
    embed
      .setColor(this.client.embed(guild.id))
      .setDescription(`${EMOJIS.CAPITAL_TROPHY} **APIClan Capital League Groups**`);

    leagueGroup
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([leagueId, clans], i) => {
        const emptySpace = this.extraSpace(leagueGroup.length, i);
        clans.sort((a, b) => (b.clanCapitalPoints || 0) - (a.clanCapitalPoints || 0));
        embed.addFields({
          name: `${CAPITAL_LEAGUES[leagueId]} ${CAPITAL_LEAGUE_MAP[leagueId]}`,
          value: `${clans
            .map((clan) => {
              const capitalPoints = (clan.clanCapitalPoints || 0).toString().padStart(4, ' ');
              const _gained = leaguesMap[clan.tag]?.gained ?? 0;
              const gained = `${_gained >= 0 ? '+' : ''}${_gained}`.padStart(4, ' ');
              const name = Util.escapeBackTick(clan.name);
              const emoji = leaguesMap[clan.tag]?.emoji || EMOJIS.CAPITAL_TROPHY;
              return `\u200e${emoji} \`${capitalPoints}\` \`${gained}\` \u2002${name}`;
            })
            .join('\n')}${emptySpace}`
        });
      });
    return embed;
  }

  private extraSpace(len: number, index: number) {
    return index === len - 1 ? '' : '\n\u200b';
  }
}
