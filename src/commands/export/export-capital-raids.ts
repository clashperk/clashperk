import { Collections } from '@app/constants';
import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';

export default class ExportCapitalRaidsCommand extends Command {
  public constructor() {
    super('export-capital-missed', {
      aliases: ['export-capital-raids'],
      category: 'export',
      channel: 'guild',
      clientPermissions: ['AttachFiles', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { limit?: number; clans?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const limit = Math.min(Math.max(args.limit || 4, 1), 52);

    const chunks = [];
    for (const clan of clans) {
      const weekends = await this.client.db
        .collection(Collections.CAPITAL_RAID_SEASONS)
        .find({ tag: clan.tag })
        .sort({ _id: -1 })
        .limit(limit)
        .toArray();

      const membersMap: Record<
        string,
        {
          name: string;
          tag: string;
          capitalResourcesLooted: number;
          attackLimit: number;
          attacks: number;
          bonusAttackLimit: number;
          attacksMissed: number;
          participation: number;
          weekends: number;
        }
      > = {};

      for (const clan of weekends.reverse()) {
        for (const member of clan.members) {
          membersMap[member.tag] ??= {
            name: member.name,
            tag: member.tag,
            capitalResourcesLooted: 0,
            attackLimit: 0,
            attacks: 0,
            bonusAttackLimit: 0,
            attacksMissed: 0,
            participation: 0,
            weekends: weekends.length
          };

          const mem = membersMap[member.tag];
          mem.capitalResourcesLooted += member.capitalResourcesLooted;
          mem.attackLimit += member.attackLimit;
          mem.attacks += member.attacks;
          mem.bonusAttackLimit += member.bonusAttackLimit;
          mem.attacksMissed += member.attackLimit + member.bonusAttackLimit - member.attacks;
          mem.participation += 1;
        }
      }

      chunks.push({
        name: clan.name,
        tag: clan.tag,
        members: Object.values(membersMap).sort((a, b) => b.attacksMissed - a.attacksMissed)
      });
    }
    if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

    const sheets: CreateGoogleSheet[] = chunks.map((chunk) => ({
      columns: [
        { name: 'Name', width: 160, align: 'LEFT' },
        { name: 'Tag', width: 120, align: 'LEFT' },
        { name: 'Total Loot', width: 100, align: 'RIGHT' },
        { name: 'Attack Limit', width: 100, align: 'RIGHT' },
        { name: 'Bonus Attack Limit', width: 100, align: 'RIGHT' },
        { name: 'Attacks Used', width: 100, align: 'RIGHT' },
        { name: 'Attacks Missed', width: 100, align: 'RIGHT' },
        { name: 'Participation', width: 100, align: 'RIGHT' },
        { name: 'Weekends', width: 100, align: 'RIGHT' }
      ],
      rows: chunk.members.map((mem) => [
        mem.name,
        mem.tag,
        mem.capitalResourcesLooted,
        mem.attackLimit,
        mem.bonusAttackLimit,
        mem.attacks,
        mem.attacksMissed,
        mem.participation,
        mem.weekends
      ]),
      title: `${chunk.name} (${chunk.tag})`
    }));

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Capital Raids]`, sheets);
    return interaction.editReply({ content: `**Capital Raids Export**`, components: getExportComponents(spreadsheet) });
  }
}
