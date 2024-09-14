import { calculateCWLMedals, WAR_LEAGUE_PROMOTION_MAP } from '@app/constants';
import { APIClan, APIWarClan } from 'clashofclans.js';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { getClanSwitchingMenu } from '../../helper/clans.helper.js';
import { aggregateRoundsForRanking, calculateLeagueRanking } from '../../helper/cwl-helper.js';
import { Command } from '../../lib/handlers.js';
import { ClanWarLeagueGroupAggregated } from '../../struct/http.js';
import { getCWLSummaryImage } from '../../struct/image-helper.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/emojis.js';
import { padEnd } from '../../util/helper.js';
import { Util } from '../../util/toolkit.js';

export default class CWLStatsCommand extends Command {
  public constructor() {
    super('cwl-stats', {
      category: 'cwl',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User; season?: string }) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const [{ body, res }, group] = await Promise.all([
      this.client.http.getClanWarLeagueGroup(clan.tag),
      this.client.storage.getWarTags(clan.tag, args.season)
    ]);
    if (res.status === 504 || body.state === 'notInWar') {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.still_searching', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
      });
    }

    const isIncorrectSeason = !res.ok && !args.season && group && group.season !== Util.getCWLSeasonId();
    const entityLike = args.season && res.ok && args.season !== body.season ? group : res.ok ? body : group;
    const isApiData = args.season ? res.ok && body.season === args.season : res.ok;

    if ((!res.ok && !group) || !entityLike || isIncorrectSeason) {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
      });
    }

    const aggregated = await this.client.http.aggregateClanWarLeague(clan.tag, { ...entityLike, leagues: group?.leagues ?? {} }, isApiData);
    if (!aggregated) {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
      });
    }

    return this.rounds(interaction, {
      body: aggregated,
      clan
    });
  }

  private async rounds(
    interaction: CommandInteraction<'cached'>,
    {
      body,
      clan
    }: {
      body: ClanWarLeagueGroupAggregated;
      clan: APIClan;
    }
  ) {
    let [index, stars, destruction] = [0, 0, 0];
    const clanTag = clan.tag;

    const collection: string[][][] = [];
    const members: Record<
      string,
      {
        name: string;
        of: number;
        attacks: number;
        stars: number;
        dest: number;
        lost: number;
      }
    > = {};
    let activeRounds = 0;
    let warsWon = 0;

    for (const data of body.wars) {
      if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
        const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
        const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
        if (this.winner(clan, opponent)) warsWon += 1;

        if (data.state === 'warEnded') {
          stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
          destruction += clan.destructionPercentage * data.teamSize;
          const end = new Date(moment(data.endTime).toDate()).getTime();
          for (const m of clan.members) {
            // eslint-disable-next-line
            members[m.tag] ??= {
              name: m.name,
              of: 0,
              attacks: 0,
              stars: 0,
              dest: 0,
              lost: 0
            };
            const member = members[m.tag];
            member.of += 1;

            if (m.attacks?.length) {
              member.attacks += 1;
              member.stars += m.attacks[0].stars;
              member.dest += m.attacks[0].destructionPercentage;
            }

            if (m.bestOpponentAttack) {
              member.lost += m.bestOpponentAttack.stars;
            }
          }

          collection.push([
            [
              `${this.winner(clan, opponent) ? EMOJIS.OK : EMOJIS.WRONG} **${clan.name}** vs **${opponent.name}**`,
              `${EMOJIS.CLOCK} [Round ${++index}] Ended ${moment
                .duration(Date.now() - end)
                .format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
            ],
            [
              `\`${clan.stars.toString().padEnd(10, ' ')} Stars ${opponent.stars.toString().padStart(10, ' ')}\``,
              `\`${this.attacks(clan.attacks, data.teamSize).padEnd(9, ' ')} Attacks ${this.attacks(
                opponent.attacks,
                data.teamSize
              ).padStart(9, ' ')}\``,
              `\`${this.destruction(clan.destructionPercentage).padEnd(7, ' ')} Destruction ${this.destruction(
                opponent.destructionPercentage
              ).padStart(7, ' ')}\``
            ]
          ]);
        }
        if (data.state === 'inWar') {
          stars += clan.stars;
          destruction += clan.destructionPercentage * data.teamSize;
          const started = new Date(moment(data.startTime).toDate()).getTime();
          for (const m of clan.members) {
            // eslint-disable-next-line
            members[m.tag] ??= {
              name: m.name,
              of: 0,
              attacks: 0,
              stars: 0,
              dest: 0,
              lost: 0
            };

            const member = members[m.tag];
            member.of += 1;

            if (m.attacks?.length) {
              member.attacks += 1;
              member.stars += m.attacks[0].stars;
              member.dest += m.attacks[0].destructionPercentage;
            }

            if (m.bestOpponentAttack) {
              member.lost += m.bestOpponentAttack.stars;
            }
          }

          collection.push([
            [
              `${EMOJIS.LOADING} **${clan.name}** vs **${opponent.name}**`,
              `${EMOJIS.CLOCK} [Round ${++index}] Started ${moment
                .duration(Date.now() - started)
                .format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
            ],
            [
              `\`${clan.stars.toString().padEnd(10, ' ')} Stars ${opponent.stars.toString().padStart(10, ' ')}\``,
              `\`${this.attacks(clan.attacks, data.teamSize).padEnd(9, ' ')} Attacks ${this.attacks(
                opponent.attacks,
                data.teamSize
              ).padStart(9, ' ')}\``,
              `\`${this.destruction(clan.destructionPercentage).padEnd(7, ' ')} Destruction ${this.destruction(
                opponent.destructionPercentage
              ).padStart(7, ' ')}\``
            ]
          ]);
        }

        if (['inWar', 'warEnded'].includes(data.state)) activeRounds += 1;
      }
    }

    if (!collection.length && body.season !== Util.getCWLSeasonId()) {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
      });
    }
    if (!collection.length) {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.cwl.no_rounds', { lng: interaction.locale })
      });
    }

    const description = collection
      .map((arr) => {
        const header = arr[0].join('\n');
        const description = arr[1].join('\n');
        return [header, description].join('\n');
      })
      .join('\n\n');

    const leagueId = body.leagues?.[clan.tag];
    const ranks = calculateLeagueRanking(aggregateRoundsForRanking(body.wars), leagueId);

    const rankIndex = ranks.findIndex((a) => a.tag === clanTag);
    const padding = Math.max(...ranks.map((r) => r.destruction)) > 9999 ? 6 : 5;

    const embeds = [
      new EmbedBuilder()
        .setColor(this.client.embed(interaction))
        .setTitle(`Clan War League Stats (${moment(body.season).format('MMM YYYY')})`)
        .setDescription(description)
    ];
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`Clan War League Ranking (${moment(body.season).format('MMM YYYY')})`);

    const medals = leagueId ? calculateCWLMedals(leagueId.toString(), 8, rankIndex + 1) : 0;
    if (leagueId) {
      const bonuses = WAR_LEAGUE_PROMOTION_MAP[leagueId].bonuses + warsWon;
      embed.setDescription(
        [
          `${EMOJIS.GAP}${EMOJIS.HASH} **\`\u200eSTAR DEST%${''.padEnd(padding - 3, ' ')}${'NAME'.padEnd(15, ' ')}\`**`,
          ranks
            .map((clan) => {
              const emoji =
                clan.rank <= WAR_LEAGUE_PROMOTION_MAP[leagueId].promotion
                  ? EMOJIS.UP_KEY
                  : clan.rank >= WAR_LEAGUE_PROMOTION_MAP[leagueId].demotion
                    ? EMOJIS.DOWN_KEY
                    : EMOJIS.STAYED_SAME;

              return `${emoji}${BLUE_NUMBERS[clan.rank]} \`\u200e ${clan.stars.toString().padEnd(3, ' ')} ${this.dest(
                clan.destruction,
                padding
              )}  ${Util.escapeBackTick(clan.name).padEnd(15, ' ')}\``;
            })
            .join('\n'),
          '',
          `${EMOJIS.HASH} Rank ${rankIndex + 1} ${EMOJIS.STAR} ${stars} ${EMOJIS.DESTRUCTION} ${destruction.toFixed()}%`,
          `${EMOJIS.CWL_MEDAL} Max. ${medals} | ${bonuses} Bonuses Assignable`
        ].join('\n')
      );
    } else {
      embed.setDescription(
        [
          `${EMOJIS.HASH} **\`\u200eSTAR DEST%${''.padEnd(padding - 3, ' ')}${'NAME'.padEnd(15, ' ')}\`**`,
          ranks
            .map((clan, i) => {
              return `${BLUE_NUMBERS[++i]} \`\u200e ${padEnd(clan.stars, 3)} ${this.dest(
                clan.destruction,
                padding
              )}  ${Util.escapeBackTick(clan.name).padEnd(15, ' ')}\``;
            })
            .join('\n'),
          '',
          `Rank #${rankIndex + 1} ${EMOJIS.STAR} ${stars} ${EMOJIS.DESTRUCTION} ${destruction.toFixed()}%`
        ].join('\n')
      );
    }

    const customIds = {
      refresh: this.createId({ cmd: this.id, tag: clanTag }),
      clans: this.createId({ cmd: this.id, string_key: 'tag' })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.refresh).setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary)
    );

    const menu = await getClanSwitchingMenu(interaction, customIds.clans, clanTag);
    await interaction.editReply({ embeds: [...embeds, embed], components: menu ? [row, menu] : [row] });
    if (!leagueId) return null;

    const { file, name, attachmentKey } = await getCWLSummaryImage({
      activeRounds,
      leagueId,
      medals,
      rankIndex,
      ranks,
      season: body.season,
      totalRounds: body.clans.length - 1
    });

    const rawFile = new AttachmentBuilder(file, { name });
    embed.setImage(attachmentKey);

    return interaction.editReply({ files: [rawFile], embeds: [...embeds, embed], components: menu ? [row, menu] : [row] });
  }

  private dest(dest: number, padding: number) {
    return dest.toFixed().toString().concat('%').padEnd(padding, ' ');
  }

  private destruction(dest: number) {
    return dest.toFixed(2).toString().concat('%');
  }

  private attacks(num: number, team: number) {
    return num.toString().concat(`/${team}`);
  }

  private winner(clan: APIWarClan, opponent: APIWarClan) {
    return this.client.http.isWinner(clan, opponent);
  }
}
