import { ClanLogsEntity, ClanLogType } from '@app/entities';
import { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder } from 'discord.js';
import { ObjectId, UpdateResult } from 'mongodb';
import { title as toTitle } from 'radash';
import { Args, Command } from '../../lib/index.js';
import { Collections, DEEP_LINK_TYPES, Flags } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';
import { createInteractionCollector } from '../../util/pagination.js';

function title(str: string) {
  return toTitle(str).replace(/cwl/i, 'CWL');
}

type LogMap = Record<string, { label?: string }>;

export const logGroups: { name: string; logs: LogMap }[] = [
  {
    name: 'Clan Logs',
    logs: {
      [ClanLogType.MEMBER_JOIN_LEAVE_LOG]: {
        label: 'Member Join/Leave Log'
      },
      [ClanLogType.ROLE_CHANGE_LOG]: {},
      [ClanLogType.CLAN_ACHIEVEMENTS_LOG]: {},

      [ClanLogType.CONTINUOUS_DONATION_LOG]: {
        label: 'Donation Log (Instant)'
      },
      [ClanLogType.DAILY_DONATION_LOG]: {
        label: 'Donation Log (Daily)'
      },
      [ClanLogType.WEEKLY_DONATION_LOG]: {
        label: 'Donation Log (Weekly)'
      },
      [ClanLogType.MONTHLY_DONATION_LOG]: {
        label: 'Donation Log (Monthly)'
      },

      [ClanLogType.CLAN_GAMES_EMBED_LOG]: {},
      [ClanLogType.LAST_SEEN_EMBED_LOG]: {},
      [ClanLogType.LEGEND_ATTACKS_DAILY_SUMMARY_LOG]: {}
    }
  },
  {
    name: 'Capital Logs',
    logs: {
      [ClanLogType.CLAN_CAPITAL_WEEKLY_SUMMARY_LOG]: {}
    }
  },
  {
    name: 'War Logs',
    logs: {
      [ClanLogType.WAR_EMBED_LOG]: {},
      [ClanLogType.WAR_MISSED_ATTACKS_LOG]: {},
      [ClanLogType.CWL_EMBED_LOG]: {},
      [ClanLogType.CWL_MISSED_ATTACKS_LOG]: {},
      [ClanLogType.CWL_LINEUP_CHANGE_LOG]: {},
      [ClanLogType.CWL_MONTHLY_SUMMARY_LOG]: {}
    }
  },
  {
    name: 'Player Logs',
    logs: {
      [ClanLogType.NAME_CHANGE_LOG]: {},
      [ClanLogType.TOWN_HALL_UPGRADE_LOG]: {},
      [ClanLogType.WAR_PREFERENCE_LOG]: {}
    }
  }
];

export const logActionsMap = logGroups.reduce<LogMap>((record, group) => {
  record = { ...record, ...group.logs };
  return record;
}, {});

export default class SetupLogsCommand extends Command {
  public constructor() {
    super('setup-logs', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      userPermissions: ['ManageGuild'],
      defer: true,
      ephemeral: true
    });
  }

  public args(interaction: CommandInteraction<'cached'>): Args {
    return {
      color: {
        match: 'COLOR',
        default: this.client.embed(interaction)
      },
      channel: {
        match: 'CHANNEL'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clan: string; action: 'enable-logs' | 'disable-logs'; color?: number }
  ) {
    const clan = await this.client.resolver.enforceSecurity(interaction, { tag: args.clan, collection: Collections.CLAN_LOGS });
    if (!clan) return;

    const disabling = args.action === 'disable-logs';

    const id = await this.client.storage.register(interaction, {
      op: Flags.SERVER_LINKED,
      guild: interaction.guild.id,
      name: clan.name,
      tag: clan.tag
    });

    await this.client.rpcHandler.add({
      tag: clan.tag,
      guild: interaction.guild.id
    });

    const collection = this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
    const logTypes = Object.keys(logActionsMap) as ClanLogType[];
    const _logs = await collection.find({ logType: { $in: logTypes }, clanTag: clan.tag, guildId: interaction.guildId }).toArray();

    const customIds: Record<string, string> = {
      logs: this.client.uuid()
    };

    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
    for (const group of logGroups) {
      const logs = Object.keys(group.logs) as ClanLogType[];
      customIds[group.name] = this.client.uuid();

      const menu = new StringSelectMenuBuilder()
        .setOptions(
          logs.map((log) => ({
            label: logActionsMap[log].label || title(log),
            emoji: EMOJIS.HASH,
            value: log
          }))
        )
        .setCustomId(customIds[group.name])
        .setMaxValues(logs.length)
        .setPlaceholder(`Select the ${group.name}`);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>();
      if (disabling) {
        const enabledLogIds = _logs.map((log) => log.logType);
        const logTypes = logs.filter((log) => enabledLogIds.includes(log));
        if (!logTypes.length) continue;

        menu.setOptions(
          logTypes.map((log) => ({
            label: logActionsMap[log].label || title(log),
            emoji: EMOJIS.HASH,
            value: log
          }))
        );
        menu.setMaxValues(logTypes.length);

        row.addComponents(menu);
        rows.push(row);
      } else {
        row.addComponents(menu);
        rows.push(row);
      }
    }
    if (!rows.length) return interaction.editReply(`No logs are enabled for **\u200e${clan.name} (${clan.tag})**`);

    const message = await interaction.editReply({
      content: [
        `## ${clan.name} (${clan.tag})`,
        _logs.length ? `### Currently Enabled Logs` : '',

        _logs.map((log) => `- ${logActionsMap[log.logType].label || title(log.logType)} <#${log.channelId}>`).join('\n'),

        disabling ? '### Select the logs you want to disable' : `### Select the logs you want to enable in <#${interaction.channelId}>`
      ].join('\n'),
      components: [...rows]
    });

    return createInteractionCollector({
      customIds,
      interaction,
      message,
      onSelect: async (action) => {
        const selectedLogs = action.values as ClanLogType[];
        const ops: Promise<UpdateResult<ClanLogsEntity>>[] = [];

        for (const logType of selectedLogs) {
          const existingLog = _logs.find((log) => log.logType === logType);

          const updateOps = collection.updateOne(
            { clanTag: clan.tag, guildId: interaction.guildId, logType },
            {
              $setOnInsert: {
                createdAt: new Date()
              },
              $set: {
                clanId: new ObjectId(id),
                isEnabled: !disabling,
                color: args.color || existingLog?.color,
                channelId: interaction.channelId,
                deepLink: DEEP_LINK_TYPES.OPEN_IN_GAME,
                webhook: existingLog?.channelId === interaction.channelId ? existingLog?.webhook : null,
                messageId: existingLog?.channelId === interaction.channelId ? existingLog?.messageId : null,
                updatedAt: new Date()
              },
              $min: {
                lastPostedAt: new Date(Date.now() - 1000 * 60 * 30)
              }
            },
            { upsert: true }
          );
          ops.push(updateOps);
        }

        await Promise.all(ops);

        if (disabling) {
          const logIds = _logs.filter((log) => selectedLogs.includes(log.logType)).map((log) => log._id);
          logIds.forEach((logId) => this.client.rpcHandler.deleteLog(logId.toHexString()));
          await collection.deleteMany({ _id: { $in: logIds } });
        } else {
          await this.client.rpcHandler.add({ guild: interaction.guild.id, tag: clan.tag });
        }

        return action.update({
          content: [
            `## ${clan.name} (${clan.tag})`,
            disabling ? '### The logs have been disabled' : `### The logs have been enabled in <#${interaction.channelId}>`,
            selectedLogs.map((log) => `- ${title(log)}`).join('\n')
          ].join('\n'),
          components: []
        });
      }
    });
  }
}
