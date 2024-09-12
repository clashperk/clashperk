import { APIClanWar, APIClanWarLeagueGroup } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { Collections } from '../../util/constants.js';
import { getExportComponents } from '../../util/helper.js';
import { Season, Util } from '../../util/toolkit.js';

export default class ExportCwlLineup extends Command {
  public constructor() {
    super('export-cwl-lineup', {
      category: 'none',
      clientPermissions: ['AttachFiles', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; season?: string }) {
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
        const { perRound } = await this.rounds(data, clan, season);

        const id = moment(data.season).format('MMM YYYY');
        chunks.push({
          name: clan.name,
          tag: clan.tag,
          perRound,
          id
        });
        continue;
      }

      if (args.season && result.body.season !== args.season) continue;
      const id = moment().format('MMM YYYY');

      const { perRound } = await this.rounds(result.body, clan);
      chunks.push({
        name: clan.name,
        tag: clan.tag,
        perRound,
        id
      });
    }

    if (!chunks.length) {
      return interaction.editReply(this.i18n('command.cwl.no_season_data', { lng: interaction.locale, season: season ?? Season.ID }));
    }

    const sheets: CreateGoogleSheet[] = chunks
      .map((chunk) => [
        ...chunk.perRound.map((round, i) => ({
          title: `Round ${i + 1} - ${Util.escapeSheetName(`${chunk.name} (${chunk.tag})`)}`,
          columns: [
            { name: 'Clan', align: 'LEFT', width: 160 },
            { name: 'Opponent Clan', align: 'LEFT', width: 160 },
            { name: 'Attacker', align: 'LEFT', width: 160 },
            { name: 'Attacker Tag', align: 'LEFT', width: 120 },
            { name: 'Opponent', align: 'LEFT', width: 160 },
            { name: 'Opponent Tag', align: 'LEFT', width: 120 },
            { name: 'Attacker TH', align: 'RIGHT', width: 100 },
            { name: 'Opponent TH', align: 'RIGHT', width: 100 }
          ],
          rows: round.clan.members.map((m, idx) => {
            const opponent = round.opponent.members[idx];

            return [
              round.clan.name,
              round.opponent.name,
              m.name,
              m.tag,
              opponent.name,
              opponent.tag,
              m.townhallLevel,
              opponent.townhallLevel
            ];
          })
        }))
      ])
      .flat();

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [CWL Lineup]`, sheets);
    return interaction.editReply({
      content: `**CWL Lineup Exports** (${clans.map((clan) => clan.name).join(',')})`,
      components: getExportComponents(spreadsheet)
    });
  }

  private async rounds(body: APIClanWarLeagueGroup, clan: { tag: string }, season?: string | null) {
    const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
    const clanTag = clan.tag;

    const perRound = [];
    for (const { warTags } of rounds) {
      for (const warTag of warTags) {
        const data = season
          ? await this.client.db.collection<APIClanWar>(Collections.CLAN_WARS).findOne({ warTag })
          : await this.client.http.getCWLRoundWithWarTag(warTag);
        if (!data) continue;
        if (data.state === 'notInWar' && !season) continue;

        if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
          const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
          const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
          clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
          opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

          perRound.push({ clan, opponent });
        }
      }
    }

    return {
      perRound
    };
  }
}
