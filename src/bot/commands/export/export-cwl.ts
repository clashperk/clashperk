import { APIClanWar, APIClanWarAttack, APIClanWarLeagueGroup, APIWarClan } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { Collections } from '../../util/Constants.js';
import { getExportComponents } from '../../util/Helper.js';
import { Season, Util } from '../../util/index.js';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default class ExportCWL extends Command {
  public constructor() {
    super('export-cwl', {
      category: 'none',
      clientPermissions: ['AttachFiles', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; season?: string; lineup_only?: boolean }) {
    const command = this.handler.getCommand('export-cwl-lineup');
    if (command && args.lineup_only) return command.exec(interaction, args);

    const season = args.season === Season.ID ? null : args.season;
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const chunks = [];
    for (const clan of clans) {
      const result = season ? null : await this.client.http.getClanWarLeagueGroup(clan.tag);
      if (!result?.res.ok || result.body.state === 'notInWar') {
        const data = await this.client.storage.getWarTags(clan.tag, season);
        if (!data) continue;
        if (args.season && data.season !== args.season) continue;
        const { members, perRound, ranking } = await this.rounds(data, clan, season);
        if (!members.length) continue;

        chunks.push({
          name: clan.name,
          tag: clan.tag,
          members,
          ranking,
          perRound,
          id: `${months[new Date(data.season).getMonth()]} ${new Date(data.season).getFullYear()}`
        });
        continue;
      }

      if (args.season && result.body.season !== args.season) continue;
      const { members, perRound, ranking } = await this.rounds(result.body, clan);
      if (!members.length) continue;
      chunks.push({
        name: clan.name,
        tag: clan.tag,
        members,
        perRound,
        ranking,
        id: `${months[new Date().getMonth()]} ${new Date().getFullYear()}`
      });
    }

    if (!chunks.length) {
      return interaction.editReply(this.i18n('command.cwl.no_season_data', { lng: interaction.locale, season: season ?? Season.ID }));
    }

    const sheets: CreateGoogleSheet[] = chunks
      .map((chunk) => [
        {
          title: Util.escapeSheetName(`${chunk.name} (${chunk.tag})`),
          columns: [
            { name: 'Name', width: 160, align: 'LEFT' },
            { name: 'Tag', width: 120, align: 'LEFT' },
            { name: 'Town Hall', width: 100, align: 'RIGHT' },
            { name: 'Wars Participated ', width: 100, align: 'RIGHT' },
            { name: 'Number of Attacks', width: 100, align: 'RIGHT' },
            { name: 'Attack Percentage', width: 100, align: 'RIGHT' },
            { name: 'Total Stars', width: 100, align: 'RIGHT' },
            { name: 'Avg. Stars', width: 100, align: 'RIGHT' },
            { name: 'True Stars', width: 100, align: 'RIGHT' },
            { name: 'Avg. True Stars', width: 100, align: 'RIGHT' },
            { name: 'Total Dest', width: 100, align: 'RIGHT' },
            { name: 'Avg Dest', width: 100, align: 'RIGHT' },
            { name: 'Three Stars', width: 100, align: 'RIGHT' },
            { name: 'Two Stars', width: 100, align: 'RIGHT' },
            { name: 'One Stars', width: 100, align: 'RIGHT' },
            { name: 'Zero Stars', width: 100, align: 'RIGHT' },
            { name: 'Missed', width: 100, align: 'RIGHT' },
            { name: 'Def Stars', width: 100, align: 'RIGHT' },
            { name: 'Avg. Def Stars', width: 100, align: 'RIGHT' },
            { name: 'Total Def Dest', width: 100, align: 'RIGHT' },
            { name: 'Avg Def Dest', width: 100, align: 'RIGHT' },
            { name: 'Lower TH Hits (Dips)', width: 100, align: 'RIGHT' },
            { name: 'Upper TH Hits (Reaches)', width: 100, align: 'RIGHT' }
            // { name: 'Same TH Hits', width: 100, align: 'RIGHT' },
          ],
          rows: chunk.members
            .filter((m) => m.of > 0)
            .map((m) => [
              m.name,
              m.tag,
              m.townHallLevel,
              m.wars,
              m.attacks,
              Number(((m.attacks / m.of) * 100).toFixed(2)),
              m.stars,
              Number((m.stars / m.of || 0).toFixed(2)),
              m.trueStars,
              Number((m.trueStars / m.of).toFixed(2)),
              Number(m.dest.toFixed(2)),
              Number((m.dest / m.of || 0).toFixed(2)),
              this.starCount(m.starTypes, 3),
              this.starCount(m.starTypes, 2),
              this.starCount(m.starTypes, 1),
              this.starCount(m.starTypes, 0),
              m.of - m.attacks,
              m.defStars,
              Number((m.defStars / m.defCount || 0).toFixed()),
              Number(m.defDestruction.toFixed(2)),
              Number((m.defDestruction / m.defCount || 0).toFixed(2)),
              m.lowerHits,
              m.upperHits
            ])
        },
        {
          title: Util.escapeSheetName(`Ranking - ${chunk.name} (${chunk.tag})`),
          columns: [
            { name: 'Rank', width: 100, align: 'CENTER' },
            { name: 'Clan', width: 160, align: 'LEFT' },
            { name: 'Tag', width: 120, align: 'LEFT' },
            { name: 'Attacks', width: 100, align: 'RIGHT' },
            { name: 'Stars', width: 100, align: 'RIGHT' },
            { name: 'Destruction', width: 100, align: 'RIGHT' }
          ],
          rows: chunk.ranking.map((round, i) => [
            i + 1,
            round.name,
            round.tag,
            round.attacks,
            round.stars,
            Number(round.destruction.toFixed(2))
          ])
        },
        {
          title: Util.escapeSheetName(`Rounds - ${chunk.name} (${chunk.tag})`),
          columns: [
            { name: 'Round', align: 'CENTER', width: 100 },
            { name: 'Clan', align: 'LEFT', width: 160 },
            { name: 'Clan Tag', align: 'LEFT', width: 120 },
            { name: 'Attacks', align: 'RIGHT', width: 100 },
            { name: 'Stars', align: 'RIGHT', width: 100 },
            { name: 'Destruction', align: 'RIGHT', width: 100 },
            { name: 'Opponent', align: 'LEFT', width: 160 },
            { name: 'Opponent Tag', align: 'LEFT', width: 120 },
            { name: 'Opp. Attacks', align: 'RIGHT', width: 100 },
            { name: 'Opp. Stars', align: 'RIGHT', width: 100 },
            { name: 'Opp. Dest.', align: 'RIGHT', width: 100 }
          ],
          rows: chunk.perRound.map((round, i) => [
            i + 1,
            round.clan.name,
            round.clan.tag,
            round.clan.attacks,
            round.clan.stars,
            Number(round.clan.destructionPercentage.toFixed(2)),
            round.opponent.name,
            round.opponent.tag,
            round.opponent.attacks,
            round.opponent.stars,
            Number(round.opponent.destructionPercentage.toFixed(2))
          ])
        },
        ...chunk.perRound.map((round, i) => ({
          title: `Round ${i + 1} - ${Util.escapeSheetName(`${chunk.name} (${chunk.tag})`)}`,
          columns: [
            { name: 'Clan', align: 'LEFT', width: 160 },
            { name: 'Opponent', align: 'LEFT', width: 160 },
            { name: 'Attacker', align: 'LEFT', width: 160 },
            { name: 'Attacker Tag', align: 'LEFT', width: 120 },
            { name: 'Stars', align: 'RIGHT', width: 100 },
            { name: 'True Stars', align: 'RIGHT', width: 100 },
            { name: 'Gained', align: 'RIGHT', width: 100 },
            { name: 'Destruction', align: 'RIGHT', width: 100 },
            { name: 'Defender', align: 'LEFT', width: 160 },
            { name: 'Defender Tag', align: 'LEFT', width: 120 },
            { name: 'Attacker Map', align: 'RIGHT', width: 100 },
            { name: 'Attacker TH', align: 'RIGHT', width: 100 },
            { name: 'Defender Map', align: 'RIGHT', width: 100 },
            { name: 'Defender TH', align: 'RIGHT', width: 100 },
            { name: 'Defender Stars', align: 'RIGHT', width: 100 },
            { name: 'Defender Destruction', align: 'RIGHT', width: 100 }
          ],
          rows: round.clan.members.map((m) => {
            const opponent = round.opponent.members.find((en) => en.tag === m.attacks?.[0]?.defenderTag);
            const gained = m.bestOpponentAttack && m.attacks?.length ? m.attacks[0].stars - m.bestOpponentAttack.stars : '';
            const __attacks = round.clan.members.flatMap((m) => m.attacks ?? []);

            const previousBestAttack = m.attacks?.length ? this.getPreviousBestAttack(__attacks, round.opponent, m.attacks[0]) : null;

            return [
              round.clan.name,
              round.opponent.name,
              m.name,
              m.tag,
              m.attacks?.length ? m.attacks.at(0)!.stars : '',
              previousBestAttack
                ? Math.max(m.attacks!.at(0)!.stars - previousBestAttack.stars)
                : m.attacks?.length
                  ? m.attacks.at(0)!.stars
                  : '',
              gained,
              m.attacks?.length ? m.attacks.at(0)!.destructionPercentage.toFixed(2) : '',
              opponent ? opponent.name : '',
              opponent ? opponent.tag : '',
              round.clan.members.findIndex((en) => en.tag === m.tag) + 1,
              m.townhallLevel,
              opponent ? round.opponent.members.findIndex((en) => en.tag === opponent.tag) + 1 : '',
              opponent ? opponent.townhallLevel : '',
              m.bestOpponentAttack?.stars ?? '',
              m.bestOpponentAttack?.destructionPercentage.toFixed(2) ?? ''
            ];
          })
        }))
      ])
      .flat();

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [CWL Stats]`, sheets);
    return interaction.editReply({
      content: `**CWL Exports** (${clans.map((clan) => clan.name).join(',')})`,
      components: getExportComponents(spreadsheet)
    });
  }

  private starCount(stars = [], count: number) {
    return stars.filter((star) => star === count).length;
  }

  private async rounds(body: APIClanWarLeagueGroup, clan: { tag: string }, season?: string | null) {
    const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
    const clanTag = clan.tag;
    const members: { [key: string]: any } = {};

    const ranking: {
      [key: string]: {
        name: string;
        tag: string;
        stars: number;
        attacks: number;
        destruction: number;
      };
    } = {};

    const perRound = [];
    for (const { warTags } of rounds) {
      for (const warTag of warTags) {
        const data = season
          ? await this.client.db.collection<APIClanWar>(Collections.CLAN_WARS).findOne({ warTag })
          : await this.client.http.getCWLRoundWithWarTag(warTag);
        if (!data) continue;
        if (data.state === 'notInWar' && !season) continue;

        // eslint-disable-next-line
        ranking[data.clan.tag] ??= {
          name: data.clan.name,
          tag: data.clan.tag,
          stars: 0,
          destruction: 0,
          attacks: 0
        };
        const clan = ranking[data.clan.tag];

        clan.stars += data.clan.stars;
        if (data.state === 'warEnded' && this.client.http.isWinner(data.clan, data.opponent)) {
          clan.stars += 10;
        }
        clan.attacks += data.clan.attacks;
        clan.destruction += data.clan.destructionPercentage * data.teamSize;

        // eslint-disable-next-line
        ranking[data.opponent.tag] ??= {
          name: data.opponent.name,
          tag: data.opponent.tag,
          stars: 0,
          destruction: 0,
          attacks: 0
        };
        const opponent = ranking[data.opponent.tag];

        opponent.stars += data.opponent.stars;
        if (data.state === 'warEnded' && this.client.http.isWinner(data.opponent, data.clan)) {
          opponent.stars += 10;
        }
        opponent.attacks += data.opponent.attacks;
        opponent.destruction += data.opponent.destructionPercentage * data.teamSize;

        if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
          const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
          const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;

          clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
          opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

          const __attacks = clan.members.flatMap((m) => m.attacks ?? []);

          if (['inWar', 'warEnded'].includes(data.state)) {
            for (const m of clan.members) {
              members[m.tag] ??= {
                name: m.name,
                tag: m.tag,
                townHallLevel: m.townhallLevel,
                of: 0,
                attacks: 0,
                stars: 0,
                trueStars: 0,
                upperHits: 0,
                lowerHits: 0,
                mirrorHits: 0,
                dest: 0,
                defStars: 0,
                defDestruction: 0,
                starTypes: [],
                defCount: 0,
                wars: 0
              };
              const member = members[m.tag];
              member.of += 1;
              member.wars += 1;

              for (const atk of m.attacks ?? []) {
                const previousBestAttack = this.getPreviousBestAttack(__attacks, opponent, atk);
                member.attacks += 1;
                member.stars += atk.stars;
                member.trueStars += previousBestAttack ? Math.max(0, atk.stars - previousBestAttack.stars) : atk.stars;
                member.dest += atk.destructionPercentage;
                member.starTypes.push(atk.stars);

                const defenderTh = opponent.members.find((mem) => mem.tag === atk.defenderTag)!.townhallLevel;
                const attackerTh = clan.members.find((mem) => mem.tag === m.tag)!.townhallLevel;

                if (attackerTh > defenderTh) {
                  // hit a TH LOWER than yours (DIP)
                  member.lowerHits += 1;
                } else if (defenderTh > attackerTh) {
                  // hit a TH HIGHER than yours (REACHES)
                  member.upperHits += 1;
                } else if (attackerTh === defenderTh) {
                  member.mirrorHits += 1;
                }
              }

              if (m.bestOpponentAttack) {
                member.defStars += m.bestOpponentAttack.stars;
                member.defDestruction += m.bestOpponentAttack.destructionPercentage;
                member.defCount += 1;
              }
            }

            perRound.push({ clan, opponent });
          }
          // break;
        }
      }
    }

    return {
      perRound,
      ranking: Object.values(ranking)
        .sort((a, b) => b.destruction - a.destruction)
        .sort((a, b) => b.stars - a.stars),
      members: Object.values(members)
        .sort((a, b) => b.dest - a.dest)
        .sort((a, b) => b.stars - a.stars)
    };
  }

  private getPreviousBestAttack(attacks: APIClanWarAttack[], opponent: APIWarClan, atk: APIClanWarAttack) {
    const defender = opponent.members.find((m) => m.tag === atk.defenderTag)!;
    const defenderDefenses = attacks.filter((atk) => atk.defenderTag === defender.tag);
    const isFresh = defenderDefenses.length === 0 || atk.order === Math.min(...defenderDefenses.map((d) => d.order));
    const previousBestAttack = isFresh
      ? null
      : [...attacks]
          .filter((_atk) => _atk.defenderTag === defender.tag && _atk.order < atk.order && _atk.attackerTag !== atk.attackerTag)
          .sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)
          .at(0) ?? null;
    return isFresh ? null : previousBestAttack;
  }
}
