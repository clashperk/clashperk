import { Collections, WarType } from '@app/constants';
import { SheetType } from '@app/entities';
import { APIWarClan } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
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
    args: { limit?: number; clans?: string; season?: string; war_type?: 'regular-and-cwl' | 'regular' | 'friendly' }
  ) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    let num = Number(args.limit ?? 25);
    num = Math.min(100, num);
    const query = args.season ? { startTime: { $gte: new Date(args.season) } } : {};

    const chunks = [];
    for (const { tag, name } of clans) {
      const cursor = this.client.db
        .collection(Collections.CLAN_WARS)
        .find({
          $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
          state: { $in: ['inWar', 'warEnded'] },
          warType:
            args.war_type === 'regular-and-cwl'
              ? { $in: [WarType.REGULAR, WarType.CWL] }
              : args.war_type === 'friendly'
                ? WarType.FRIENDLY
                : WarType.REGULAR,
          ...query
        })
        .sort({ _id: -1 })
        .limit(num);

      const members: { [key: string]: any } = {};
      for await (const war of cursor) {
        const clan: APIWarClan = war.clan.tag === tag ? war.clan : war.opponent;
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
            wars: 0
          };

          const member = members[m.tag];
          member.of += war.attacksPerMember;
          member.wars += 1;

          for (const atk of m.attacks ?? []) {
            const prev = this.client.coc.getPreviousBestAttack(attacks, atk);
            member.trueStars += Math.max(0, atk.stars - (prev?.stars ?? 0));
          }

          if (m.attacks?.length) {
            member.attacks += m.attacks.length;
            member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
            member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
            member.starTypes.push(...m.attacks.map((atk: any) => atk.stars));
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

    if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

    const sheets: CreateGoogleSheet[] = chunks.map((chunk) => ({
      columns: [
        { name: 'Name', width: 160, align: 'LEFT' },
        { name: 'Tag', width: 120, align: 'LEFT' },
        { name: 'Town Hall', width: 100, align: 'RIGHT' },
        { name: 'War Count', width: 100, align: 'RIGHT' },
        { name: 'Total Attacks', width: 100, align: 'RIGHT' },
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
        { name: `${chunk.name}`, width: 100, align: 'RIGHT' },
        { name: `${chunk.tag}`, width: 100, align: 'RIGHT' }
      ],
      rows: chunk.members.map((m) => [
        m.name,
        m.tag,
        m.townHallLevel,
        m.wars,
        m.of,
        m.stars,
        Number((m.stars / m.of || 0).toFixed(2)),
        m.trueStars,
        Number((m.trueStars / m.of || 0).toFixed(2)),
        Number(m.dest.toFixed(2)),
        Number((m.dest / m.of || 0).toFixed(2)),
        this.starCount(m.starTypes, 3),
        this.starCount(m.starTypes, 2),
        this.starCount(m.starTypes, 1),
        this.starCount(m.starTypes, 0),
        m.of - m.attacks,
        m.defCount,
        m.defStars,
        Number((m.defStars / m.defCount || 0).toFixed(2)),
        Number(m.defDestruction.toFixed(2)),
        Number((m.defDestruction / m.defCount || 0).toFixed(2))
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
      content: `**War Export [Last ${num}]** (${clans.map((clan) => clan.name).join(',')})`,
      components: getExportComponents(spreadsheet)
    });
  }

  private starCount(stars: number[] = [], count: number) {
    return stars.filter((star) => star === count).length;
  }
}
