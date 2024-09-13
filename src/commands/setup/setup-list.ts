import { ClanLogType, ClanStoresEntity } from '@app/entities';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { WithId } from 'mongodb';
import { title as toTitle } from 'radash';
import { Command } from '../../lib/handlers.js';
import { Collections } from '../../util/constants.js';
import { Util } from '../../util/toolkit.js';
import { logActionsMap } from './setup-clan-logs.js';

function title(str: string) {
  return toTitle(str).replace(/cwl/i, 'CWL');
}

export default class SetupListCommand extends Command {
  public constructor() {
    super('setup-list', {
      category: 'setup',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; list?: boolean; logs?: boolean }) {
    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const customIds = {
      clans: this.createId({ cmd: this.id, list: true, clans: resolvedArgs }),
      logs: this.createId({ cmd: this.id, logs: true })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.clans).setStyle(ButtonStyle.Primary).setLabel('Linked Clans'),
      new ButtonBuilder().setCustomId(customIds.logs).setStyle(ButtonStyle.Primary).setLabel('Enabled Logs')
    );

    if ((args.clans && clans.length) || args.logs) {
      const embeds = await this.getFeatures(interaction, clans);
      if (!embeds.length) return interaction.editReply('No clans are linked.');

      const [firstChunk, ...chunksGroup] = Util.chunk(embeds, 8);
      await interaction.editReply({ embeds: firstChunk });

      for (const chunks of chunksGroup) {
        await interaction.followUp({ embeds: chunks, ephemeral: true });
      }
      return;
    }

    if (args.list) {
      const embeds = await this.getClanList(interaction);
      if (!embeds.length) return interaction.editReply('No clans are linked.');

      return interaction.editReply({ embeds });
    }

    const _clans = await this.client.storage.find(interaction.guildId);
    return interaction.editReply({
      components: [row],
      content: [
        `${_clans.length} clans are linked. Click the buttons below to see **Enabled Features** and **Linked Clans**`,
        '',
        `Visit <https://docs.clashperk.com/overview/getting-set-up> for a detailed guide on how to setup the bot.`
      ].join('\n')
    });
  }

  private async getClanList(interaction: CommandInteraction) {
    const clans = await this.client.storage.find(interaction.guild!.id);
    const clanList = await this.client.http._getClans(clans);
    if (!clans.length) return [];

    const nameLen = Math.max(...clanList.map((clan) => clan.name.length)) + 1;
    const tagLen = Math.max(...clanList.map((clan) => clan.tag.length)) + 1;
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: 'Linked Clans', iconURL: interaction.guild!.iconURL()! })
      .setDescription(
        clanList
          .map(
            (clan) =>
              `\`\u200e${clan.name.padEnd(nameLen, ' ')} ${clan.tag.padStart(tagLen, ' ')}  ${clan.members
                .toString()
                .padStart(2, ' ')}/50 \u200f\``
          )
          .join('\n')
      );

    return [embed];
  }

  private async getFeatures(interaction: CommandInteraction<'cached'>, clans: WithId<ClanStoresEntity>[]) {
    const logTypes = Object.keys(logActionsMap) as ClanLogType[];
    const logs = await this.client.db
      .collection(Collections.CLAN_LOGS)
      .find({ guildId: interaction.guild.id, logType: { $in: logTypes } })
      .toArray();

    const fetched = clans.map((clan) => {
      const features = logs.filter((en) => en.clanTag === clan.tag);
      const channels = clan.channels?.map((id) => this.client.channels.cache.get(id)?.toString()) ?? [];

      return {
        name: clan.name,
        tag: clan.tag,
        color: clan.color,
        alias: clan.alias ? `(${clan.alias}) ` : '',
        channels,
        features: logTypes.map((logType) => {
          const entry = features.find((en) => en.logType === logType);
          return {
            name: logActionsMap[logType].label || title(logType),
            channel: entry && this.client.channels.cache.get(entry.channelId)?.toString()
          };
        })
      };
    });

    return fetched.map((clan) => {
      const channels = clan.channels.filter((_) => _);

      const embed = new EmbedBuilder();
      embed.setAuthor({ name: `\u200e${clan.name} (${clan.tag})` });

      if (clan.color) embed.setColor(clan.color);
      if (channels.length) embed.setDescription(channels.join(', '));

      embed.addFields(
        clan.features.map((record) => ({
          name: record.name,
          value: record.channel ?? `-`,
          inline: true
        }))
      );

      return embed;
    });
  }
}
