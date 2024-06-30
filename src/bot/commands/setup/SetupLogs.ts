import { ClanLogsEntity, ClanLogType } from '@app/entities';
import { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder } from 'discord.js';
import { ObjectId, UpdateResult } from 'mongodb';
import { title } from 'radash';
import { Command } from '../../lib/index.js';
import { Collections, DEEP_LINK_TYPES, Flags } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { createInteractionCollector } from '../../util/Pagination.js';

export const logActionsMap: Record<
  string,
  {
    label?: string;
  }
> = {
  [ClanLogType.MEMBER_JOIN_LEAVE_LOG]: {
    label: 'Member Join/Leave Log'
  },
  [ClanLogType.ROLE_CHANGE_LOG]: {},
  [ClanLogType.TOWN_HALL_UPGRADE_LOG]: {},
  [ClanLogType.WAR_PREFERENCE_LOG]: {},
  [ClanLogType.NAME_CHANGE_LOG]: {},
  [ClanLogType.CONTINUOUS_DONATION_LOG]: {
    label: 'Donation Log (Continuous)'
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
  [ClanLogType.CLAN_ACHIEVEMENTS_LOG]: {},
  [ClanLogType.CLAN_CAPITAL_WEEKLY_SUMMARY_LOG]: {},
  [ClanLogType.CLAN_GAMES_EMBED_LOG]: {},
  [ClanLogType.LAST_SEEN_EMBED_LOG]: {},
  [ClanLogType.LEGEND_ATTACKS_DAILY_SUMMARY_LOG]: {},

  [ClanLogType.CLAN_WAR_EMBED_LOG]: {},
  [ClanLogType.CWL_EMBED_LOG]: {},
  [ClanLogType.CWL_MISSED_ATTACKS_LOG]: {},
  [ClanLogType.CLAN_WAR_MISSED_ATTACKS_LOG]: {}
};

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

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans: string; action: 'enable' | 'disable' }) {
    const clan = await this.client.resolver.enforceSecurity(interaction, { tag: args.clans, collection: Collections.CLAN_LOGS });
    if (!clan) return;

    const id = await this.client.storage.register(interaction, {
      op: Flags.SERVER_LINKED,
      guild: interaction.guild.id,
      name: clan.name,
      tag: clan.tag
    });

    await this.client.rpcHandler.add(id, {
      op: Flags.CHANNEL_LINKED,
      tag: clan.tag,
      guild: interaction.guild.id
    });

    const collection = this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
    const logs = Object.keys(logActionsMap) as ClanLogType[];

    const customIds = {
      logs: this.client.uuid()
    };

    const menu = new StringSelectMenuBuilder()
      .setOptions(
        logs.map((log) => ({
          label: logActionsMap[log].label || title(log),
          emoji: EMOJIS.GEAR,
          value: log
        }))
      )
      .setCustomId(customIds.logs)
      .setMaxValues(logs.length)
      .setPlaceholder('Select the Logs');

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const _logs = await collection.find({ logType: { $in: logs }, clanTag: clan.tag, guildId: interaction.guildId }).toArray();
    const message = await interaction.editReply({
      content: [
        `## Select the logs you want to enable in <#${interaction.channelId}>`,
        _logs.map((log) => `- ${logActionsMap[log.logType].label || title(log.logType)} (<#${log.channelId}>)`).join('\n')
      ].join('\n'),
      components: [row]
    });

    return createInteractionCollector({
      customIds,
      interaction,
      message,
      onSelect: async (action) => {
        const selectedLogs = action.values as ClanLogType[];
        const ops: Promise<UpdateResult<ClanLogsEntity>>[] = [];

        for (const logType of selectedLogs) {
          const updateOps = collection.updateOne(
            { clanTag: clan.tag, guildId: interaction.guildId, logType },
            {
              $setOnInsert: {
                createdAt: new Date()
              },
              $set: {
                clanTag: clan.tag,
                guildId: interaction.guild.id,
                logType,
                isEnabled: args.action !== 'disable',
                clanId: new ObjectId(id),
                channelId: interaction.channelId,
                deepLink: DEEP_LINK_TYPES.OPEN_IN_GAME,
                webhook: null,
                messageId: null,
                updatedAt: new Date()
              },
              $min: {
                lastPostedAt: new Date()
              }
            },
            { upsert: true }
          );
          ops.push(updateOps);
        }

        await Promise.all(ops);

        if (args.action === 'disable') {
          const logIds = _logs.filter((log) => selectedLogs.includes(log.logType)).map((log) => log._id);
          logIds.forEach((logId) => this.client.rpcHandler.removeV2(logId.toHexString()));
          await collection.deleteMany({ _id: { $in: logIds } });
        } else {
          await this.client.rpcHandler.addV2(interaction.guildId);
        }

        return action.update({
          content: [
            `## The logs have been enabled in <#${interaction.channelId}>`,
            selectedLogs.map((log) => `- ${title(log)}`).join('\n')
          ].join('\n'),
          components: []
        });
      }
    });
  }
}
