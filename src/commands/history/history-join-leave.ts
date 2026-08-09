import { ButtonInteraction, CommandInteraction, User } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';

export default class JoinLeaveHistoryCommand extends Command {
  public constructor() {
    super('join-leave-history', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; player?: string; user?: User }
  ) {
    if (args.user) {
      const playerTags = await this.client.resolver.getLinkedPlayerTags(args.user.id);
      const { result } = await this.getHistory(interaction, playerTags);
      if (!result.length) {
        return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
      }
      return this.export(interaction, result);
    }

    if (args.player) {
      const player = await this.client.resolver.resolvePlayer(interaction, args.player);
      if (!player) return null;
      const playerTags = [player.tag];
      const { result } = await this.getHistory(interaction, playerTags);
      if (!result.length) {
        return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
      }
      return this.export(interaction, result);
    }

    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const { result } = await this.getClanHistory(
      interaction,
      clans.map((clan) => clan.tag)
    );
    if (!result.length) {
      return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
    }
    return this.export(interaction, result);
  }

  private async getHistory(interaction: CommandInteraction<'cached'>, playerTags: string[]) {
    const rows = await this.client.clickhouse
      .query({
        query: `
          SELECT tag, clanTag, action, createdAt
          FROM player_activities
          WHERE
            tag IN {playerTags: Array(String)}
            AND action IN ('JOINED_CLAN', 'LEFT_CLAN')
            AND createdAt >= now() - INTERVAL 30 DAY
          ORDER BY createdAt DESC
          LIMIT 10000
        `,
        query_params: { playerTags }
      })
      .then((res) =>
        res.json<{ tag: string; clanTag: string; action: string; createdAt: string }>()
      );

    const result: AggregatedResult[] = rows.data.map((r) => ({
      name: 'Unknown',
      tag: r.tag,
      op: r.action,
      clan_name: 'Unknown',
      clan_tag: r.clanTag,
      created_at: r.createdAt
    }));
    return { embeds: [], result };
  }

  private async getClanHistory(interaction: CommandInteraction<'cached'>, clanTags: string[]) {
    const rows = await this.client.clickhouse
      .query({
        query: `
          SELECT tag, clanTag, action, createdAt
          FROM player_activities
          WHERE
            clanTag IN {clanTags: Array(String)}
            AND action IN ('JOINED_CLAN', 'LEFT_CLAN')
            AND createdAt >= now() - INTERVAL 30 DAY
          ORDER BY createdAt DESC
          LIMIT 10000
        `,
        query_params: { clanTags }
      })
      .then((res) =>
        res.json<{ tag: string; clanTag: string; action: string; createdAt: string }>()
      );

    const result: AggregatedResult[] = rows.data.map((r) => ({
      name: 'unknown',
      tag: r.tag,
      op: r.action,
      clan_name: 'unknown',
      clan_tag: r.clanTag,
      created_at: r.createdAt
    }));
    return { embeds: [], result };
  }

  private async export(
    interaction: ButtonInteraction<'cached'> | CommandInteraction<'cached'>,
    result: AggregatedResult[]
  ) {
    const sheets: CreateGoogleSheet[] = [
      {
        title: `Join/Leave History`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          { name: 'OP', align: 'LEFT', width: 100 },
          { name: 'CLAN NAME', align: 'LEFT', width: 160 },
          { name: 'CLAN TAG', align: 'LEFT', width: 160 },
          { name: 'CREATED AT', align: 'LEFT', width: 160 }
        ],
        rows: result.map((r) => [
          r.name,
          r.tag,
          r.op,
          r.clan_name,
          r.clan_tag,
          new Date(r.created_at)
        ])
      }
    ];

    const spreadsheet = await createGoogleSheet(
      `${interaction.guild.name} [Join/Leave History]`,
      sheets
    );
    return interaction.editReply({
      content: '**Join/Leave history of last 30 days**',
      components: getExportComponents(spreadsheet)
    });
  }
}

interface AggregatedResult {
  tag: string;
  name: string;
  op: string;
  clan_name: string;
  clan_tag: string;
  created_at: string;
}
