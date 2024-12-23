import { Collections, WarType } from '@app/constants';
import { SheetType } from '@app/entities';
import { APIClanWar, APIWarClan } from 'clashofclans.js';
import { CommandInteraction } from 'discord.js';
import { Filter } from 'mongodb';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';

export default class ExportWarAttackLogCommand extends Command {
  public constructor() {
    super('export-attack-log', {
      category: 'export',
      channel: 'guild',
      clientPermissions: ['AttachFiles', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { limit?: number; clans?: string; season?: string; war_type?: string }
  ) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    let num = Number(args.limit ?? 25);
    num = Math.min(100, num);

    const query: Filter<ClanWarsEntity> = args.season ? { startTime: { $gte: new Date(args.season) } } : {};
    if (!args.war_type) query.warType = { $in: [WarType.REGULAR, WarType.CWL] };
    else query.warType = args.war_type === 'cwl' ? WarType.CWL : args.war_type === 'friendly' ? WarType.FRIENDLY : WarType.REGULAR;

    const chunks = [];

    for (const { tag, name } of clans) {
      const cursor = this.client.db
        .collection<ClanWarsEntity>(Collections.CLAN_WARS)
        .find({
          $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
          state: { $in: ['inWar', 'warEnded'] },
          ...query
        })
        .sort({ _id: -1 })
        .limit(num);

      const attacks: AggregatedResult[] = [];
      for await (const war of cursor) {
        const clan: APIWarClan = war.clan.tag === tag ? war.clan : war.opponent;
        const opponent: APIWarClan = war.clan.tag === tag ? war.opponent : war.clan;

        clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
        clan.members = clan.members.map((mem, idx) => ({ ...mem, mapPosition: idx + 1 }));
        opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);
        opponent.members = opponent.members.map((mem, idx) => ({ ...mem, mapPosition: idx + 1 }));

        const __attacks = clan.members
          .filter((m) => m.attacks?.length)
          .map((m) => m.attacks!)
          .flat();

        const __defenses = opponent.members
          .filter((m) => m.attacks?.length)
          .map((m) => m.attacks!)
          .flat();

        for (const m of clan.members) {
          for (const atk of m.attacks ?? []) {
            const _previousBestAttack = this.client.coc.getPreviousBestAttack(__attacks, atk);
            const _isFresh = _previousBestAttack === null;
            const _newStars = Math.max(0, atk.stars - (_previousBestAttack?.stars ?? 0));
            const _defender = opponent.members.find((mem) => mem.tag === atk.defenderTag)!;

            attacks.push({
              name: m.name,
              tag: m.tag,
              mapPosition: m.mapPosition,
              townHallLevel: m.townhallLevel,
              warId: war.id,
              order: atk.order,
              attackerTag: m.tag,
              defenderTag: atk.defenderTag,
              defenderTownHallLevel: _defender.townhallLevel,
              destructionPercentage: atk.destructionPercentage,
              defenderMapPosition: _defender.mapPosition,
              defenderName: _defender.name,
              clanLevel: clan.clanLevel,
              enemyClanLevel: opponent.clanLevel,
              attackerHomeClan: 1,
              stars: atk.stars,
              newStars: _newStars,
              isFresh: _isFresh,
              clanName: clan.name,
              clanTag: clan.tag,
              enemyClanTag: opponent.tag,
              enemyClanName: opponent.name,
              startTime: war.startTime,
              teamSize: war.teamSize,
              warType: war.warType === WarType.CWL ? 'cwl' : war.warType === WarType.FRIENDLY ? 'friendly' : 'normal'
            });
          }
        }

        for (const m of opponent.members) {
          for (const atk of m.attacks ?? []) {
            const _previousBestAttack = this.client.coc.getPreviousBestAttack(__defenses, atk);
            const _isFresh = _previousBestAttack === null;
            const _newStars = Math.max(0, atk.stars - (_previousBestAttack?.stars ?? 0));
            const _defender = clan.members.find((mem) => mem.tag === atk.defenderTag)!;

            attacks.push({
              name: m.name,
              tag: m.tag,
              mapPosition: m.mapPosition,
              townHallLevel: m.townhallLevel,
              warId: war.id,
              order: atk.order,
              attackerTag: m.tag,
              defenderTag: atk.defenderTag,
              defenderTownHallLevel: _defender.townhallLevel,
              destructionPercentage: atk.destructionPercentage,
              defenderMapPosition: _defender.mapPosition,
              defenderName: _defender.name,
              clanLevel: clan.clanLevel,
              enemyClanLevel: opponent.clanLevel,
              attackerHomeClan: 0,
              stars: atk.stars,
              newStars: _newStars,
              isFresh: _isFresh,
              clanName: clan.name,
              clanTag: clan.tag,
              enemyClanTag: opponent.tag,
              enemyClanName: opponent.name,
              startTime: war.startTime,
              teamSize: war.teamSize,
              warType: war.warType === WarType.CWL ? 'cwl' : war.warType === WarType.FRIENDLY ? 'friendly' : 'normal'
            });
          }
        }
      }

      chunks.push({
        name,
        tag,
        attacks
      });
    }

    if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

    const sheets: CreateGoogleSheet[] = chunks.map((chunk) => ({
      columns: [
        { name: 'Tag', width: 120, align: 'LEFT' },
        { name: 'Name', width: 160, align: 'LEFT' },
        { name: 'Position', width: 120, align: 'RIGHT' },
        { name: 'Town Hall', width: 100, align: 'RIGHT' },
        { name: 'War ID', width: 100, align: 'RIGHT' },
        { name: 'Attack Order', width: 100, align: 'RIGHT' },
        { name: 'Attacker Tag', width: 100, align: 'LEFT' },
        { name: 'Defender Tag', width: 100, align: 'LEFT' },
        { name: 'Stars', width: 100, align: 'RIGHT' },
        { name: 'New Stars', width: 100, align: 'RIGHT' },
        { name: 'Destruction', width: 100, align: 'RIGHT' },
        { name: 'Defender Tag', width: 100, align: 'LEFT' },
        { name: 'Defender Name', width: 100, align: 'LEFT' },
        { name: 'Defender Position', width: 100, align: 'RIGHT' },
        { name: 'Defender TH', width: 100, align: 'RIGHT' },
        { name: 'Attacker Home Clan', width: 100, align: 'RIGHT' },
        { name: 'Clan Tag', width: 100, align: 'LEFT' },
        { name: 'Clan Name', width: 100, align: 'LEFT' },
        { name: 'Clan Level', width: 100, align: 'RIGHT' },
        { name: 'Enemy Clan Tag', width: 100, align: 'LEFT' },
        { name: 'Enemy Clan Name', width: 100, align: 'LEFT' },
        { name: 'Enemy Clan Level', width: 100, align: 'RIGHT' },
        { name: 'War Start Time', width: 100, align: 'LEFT' },
        { name: 'Team Size', width: 100, align: 'RIGHT' },
        { name: 'War Type', width: 100, align: 'LEFT' }
      ],
      rows: chunk.attacks.map((m) => [
        m.tag,
        m.name,
        m.mapPosition,
        m.townHallLevel,
        m.warId,
        m.order,
        m.attackerTag,
        m.defenderTag,
        m.stars,
        m.newStars,
        m.destructionPercentage,
        m.defenderTag,
        m.defenderName,
        m.defenderMapPosition,
        m.defenderTownHallLevel,
        m.attackerHomeClan,
        m.clanTag,
        m.clanName,
        m.clanLevel,
        m.enemyClanTag,
        m.enemyClanName,
        m.enemyClanLevel,
        m.startTime,
        m.teamSize,
        m.warType
      ]),
      title: `${chunk.name} (${chunk.tag})`
    }));

    const spreadsheet = await this.client.util.createOrUpdateSheet({
      clans,
      guild: interaction.guild,
      label: 'Attack Log',
      sheets,
      sheetType: SheetType.ATTACK_LOG
    });

    return interaction.followUp({
      content: `**War Attacks** (${clans.map((clan) => clan.name).join(',')})`,
      components: getExportComponents(spreadsheet)
    });
  }
}

interface ClanWarsEntity extends Omit<APIClanWar, 'startTime'> {
  id: number;
  warType: WarType;
  startTime: Date | string;
}

export interface AggregatedResult {
  name: string;
  tag: string;
  mapPosition: number;
  townHallLevel: number;
  warId: number;
  order: number;
  attackerTag: string;
  defenderTag: string;
  defenderName: string;
  defenderMapPosition: number;
  stars: number;
  newStars: number;
  isFresh: boolean;
  destructionPercentage: number;
  defenderTownHallLevel: number;
  attackerHomeClan: number;
  clanTag: string;
  clanName: string;
  clanLevel: number;
  enemyClanTag: string;
  enemyClanName: string;
  enemyClanLevel: number;
  startTime: string | Date;
  teamSize: number;
  warType: string;
}
