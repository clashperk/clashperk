import { Collections, WarType } from '@app/constants';
import { ClanWarsEntity, SheetType } from '@app/entities';
import { APIWarClan } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';

export default class ExportWarsCommand extends Command {
  public constructor() {
    super('export-wars', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['AttachFiles', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      limit?: number;
      clans?: string;
      war_type?: 'regular-and-cwl' | 'regular' | 'friendly';
      start_date?: string;
      end_date?: string;
    }
  ) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    if (
      (args.start_date && !moment(args.start_date, true).isValid()) ||
      (args.end_date && !moment(args.end_date, true).isValid())
    ) {
      return interaction.editReply(
        'Invalid date format, allowed formats are `YYYY-MM-DD` or `YYYY-MM-DD HH:mm`'
      );
    }

    const startTime = moment(args.start_date || moment().subtract(30, 'days')).toDate();
    const endTime = moment(args.end_date || moment()).toDate();

    if (moment(endTime).diff(moment(startTime), 'months') > 6) {
      return interaction.editReply('The date range cannot exceed 6 months.');
    }

    if (moment(startTime).isAfter(endTime)) {
      return interaction.editReply('The start date cannot be after the end date.');
    }

    const days = moment(endTime).diff(moment(startTime), 'days');

    const chunks = [];
    for (const { tag, name } of clans) {
      const cursor = this.client.db
        .collection<ClanWarsEntity>(Collections.CLAN_WARS)
        .find({
          $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
          state: { $in: ['inWar', 'warEnded'] },
          warType:
            args.war_type === 'regular-and-cwl'
              ? { $in: [WarType.REGULAR, WarType.CWL] }
              : args.war_type === 'friendly'
                ? WarType.FRIENDLY
                : WarType.REGULAR,
          startTime: { $gte: startTime },
          endTime: { $lte: endTime }
        })
        .sort({ _id: -1 })
        .limit(args.limit || 120);

      const members: { [key: string]: any } = {};
      for await (const war of cursor) {
        const ended = war.state === 'warEnded' || moment().isAfter(moment(war.endTime));
        if (!ended) continue;

        const clan: APIWarClan = war.clan.tag === tag ? war.clan : war.opponent;
        const opponent: APIWarClan = war.clan.tag === tag ? war.opponent : war.clan;

        clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
        clan.members = clan.members.map((m, idx) => ({ ...m, mapPosition: idx + 1 }));

        opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);
        opponent.members = opponent.members.map((m, idx) => ({ ...m, mapPosition: idx + 1 }));

        const attacks = clan.members
          .filter((m) => m.attacks?.length)
          .map((m) => m.attacks!)
          .flat();

        for (const m of clan.members) {
          members[m.tag] ??= {
            name: m.name,
            tag: m.tag,
            townHallLevel: m.townhallLevel,
            attacks: 0,
            stars: 0,
            trueStars: 0,
            dest: 0,
            defStars: 0,
            starTypes: [],
            defCount: 0,
            of: 0,
            defDestruction: 0,
            attackPosition: 0,
            attackDistance: 0,
            townHallDistance: 0,
            wars: 0
          };

          const member = members[m.tag];
          member.of += war.attacksPerMember;
          member.wars += 1;

          for (const atk of m.attacks ?? []) {
            const prev = this.client.coc.getPreviousBestAttack(attacks, atk);
            member.trueStars += Math.max(0, atk.stars - (prev?.stars ?? 0));

            const defender = opponent.members.find((mem) => mem.tag === atk.defenderTag)!;
            member.attackPosition += defender.mapPosition;
            member.attackDistance += defender.mapPosition - m.mapPosition;
            member.townHallDistance += defender.townhallLevel - m.townhallLevel;
          }

          if (m.attacks?.length) {
            member.attacks += m.attacks.length;
            member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
            member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
            member.starTypes.push(...m.attacks.map((atk) => atk.stars));
          }

          if (m.bestOpponentAttack) {
            member.defStars += m.bestOpponentAttack.stars;
            member.defDestruction += m.bestOpponentAttack.destructionPercentage;
            member.defCount += 1;
          }
        }
      }

      chunks.push({
        name,
        tag,
        members: Object.values(members)
          .sort((a, b) => b.dest - a.dest)
          .sort((a, b) => b.stars - a.stars)
      });
    }

    if (!chunks.length)
      return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

    const sheets: CreateGoogleSheet[] = chunks.map((chunk) => ({
      columns: [
        { name: 'Name', width: 160, align: 'LEFT' },
        { name: 'Tag', width: 120, align: 'LEFT' },
        { name: 'Town Hall', width: 100, align: 'RIGHT' },
        { name: 'Wars Participated', width: 100, align: 'RIGHT' },
        { name: 'Number of Attacks', width: 100, align: 'RIGHT' },
        { name: 'Total Stars', width: 100, align: 'RIGHT' },
        { name: 'Avg. Stars', width: 100, align: 'RIGHT' },
        { name: 'True Stars', width: 100, align: 'RIGHT' },
        { name: 'Avg. True Stars', width: 100, align: 'RIGHT' },
        { name: 'Total Dest', width: 100, align: 'RIGHT' },
        { name: 'Avg. Dest', width: 100, align: 'RIGHT' },
        { name: 'Three Stars', width: 100, align: 'RIGHT' },
        { name: 'Two Stars', width: 100, align: 'RIGHT' },
        { name: 'One Stars', width: 100, align: 'RIGHT' },
        { name: 'Zero Stars', width: 100, align: 'RIGHT' },
        { name: 'Missed', width: 100, align: 'RIGHT' },
        { name: 'Total Defenses', width: 100, align: 'RIGHT' },
        { name: 'Total Def Stars', width: 100, align: 'RIGHT' },
        { name: 'Avg. Def Stars', width: 100, align: 'RIGHT' },
        { name: 'Total Def Dest', width: 100, align: 'RIGHT' },
        { name: 'Avg. Def Dest', width: 100, align: 'RIGHT' },
        {
          name: 'Avg. Target Position',
          width: 100,
          align: 'RIGHT',
          note: 'The average position of opponents a player attacked over a period. For example, attacks on positions 20, 25, and 30 yield an average of 25'
        },
        {
          name: 'Avg. Target Distance',
          width: 100,
          align: 'RIGHT',
          note: 'The average distance between the player and the opponent they attacked. For example, #5 player attacks on positions 20, 25, and 30 yield an average of -20'
        },
        {
          name: 'Avg. TH Distance',
          width: 100,
          align: 'RIGHT',
          note: 'The average difference in town hall levels between the player and the opponent they attacked. For example, a TH 14 player attacks on TH 15, and 16 yield an average of 1.5'
        },

        { name: `${chunk.name}`, width: 100, align: 'RIGHT' },
        { name: `${chunk.tag}`, width: 100, align: 'RIGHT' }
      ],
      rows: chunk.members.map((m) => [
        m.name,
        m.tag,
        m.townHallLevel,
        m.wars,
        m.attacks,
        m.stars,
        Number((m.stars / m.attacks || 0).toFixed(2)),
        m.trueStars,
        Number((m.trueStars / m.attacks || 0).toFixed(2)),
        Number(m.dest.toFixed(2)),
        Number((m.dest / m.attacks || 0).toFixed(2)),
        this.starCount(m.starTypes, 3),
        this.starCount(m.starTypes, 2),
        this.starCount(m.starTypes, 1),
        this.starCount(m.starTypes, 0),
        m.of - m.attacks,
        m.defCount,
        m.defStars,
        Number((m.defStars / m.defCount || 0).toFixed(2)),
        Number(m.defDestruction.toFixed(2)),
        Number((m.defDestruction / m.defCount || 0).toFixed(2)),
        Number((m.attackPosition / m.attacks || 0).toFixed(2)),
        Number((m.attackDistance / m.attacks || 0).toFixed(2)),
        Number((m.townHallDistance / m.attacks || 0).toFixed(2))
      ]),
      title: `${chunk.name} (${chunk.tag})`
    }));

    const spreadsheet = await this.client.util.createOrUpdateSheet({
      clans,
      guild: interaction.guild,
      label: 'War Stats',
      sheets,
      sheetType:
        args.war_type === 'regular-and-cwl'
          ? SheetType.COMBINED_WARS
          : args.war_type === 'friendly'
            ? SheetType.FRIENDLY_WARS
            : SheetType.REGULAR_WARS
    });

    return interaction.editReply({
      content: `**War Export [Last ${days} days]** (${clans.map((clan) => clan.name).join(',')})`,
      components: getExportComponents(spreadsheet)
    });
  }

  private starCount(stars: number[] = [], count: number) {
    return stars.filter((star) => star === count).length;
  }
}
